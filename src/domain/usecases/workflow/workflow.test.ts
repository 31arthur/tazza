import { statusOf, type Article } from '../../entities/Article';
import { canEditText, canTransition, nextStatuses, MAX_VERSIONS, type Actor } from '../../entities/Workflow';
import { WorkflowError } from '../../errors/DomainError';
import { InMemoryArticleRepository, FixedClock, SequentialIds } from '../../testing/fakes';
import { UpdateArticle } from '../article/UpdateArticle';
import { AddArticleNote } from './AddArticleNote';
import { ChangeArticleStatus } from './ChangeArticleStatus';
import { ResolveArticleNote } from './ResolveArticleNote';
import { RestoreArticleVersion } from './RestoreArticleVersion';
import { SaveArticleVersion } from './SaveArticleVersion';

const reporter: Actor = { name: 'Asha', role: 'reporter' };
const editor: Actor = { name: 'Ravi', role: 'editor' };
const designer: Actor = { name: 'Meena', role: 'designer' };

const story = (extra: Partial<Article> = {}): Article => ({
  id: 'a1',
  editionId: 'e',
  headline: 'First',
  subHeadline: '',
  byline: '',
  body: [{ type: 'paragraph', children: [{ text: 'one' }] }],
  createdAt: 1,
  updatedAt: 1,
  ...extra,
});

const setup = async (article = story()) => {
  const articles = new InMemoryArticleRepository();
  await articles.save(article);
  const ids = new SequentialIds();
  const clock = new FixedClock();
  return {
    articles,
    change: new ChangeArticleStatus(articles, ids, clock),
    note: new AddArticleNote(articles, ids, clock),
    resolve: new ResolveArticleNote(articles),
    save: new SaveArticleVersion(articles, ids, clock),
    restore: new RestoreArticleVersion(articles, ids, clock),
    update: new UpdateArticle(articles, clock),
  };
};

describe('workflow rules', () => {
  it('lets reporters submit, and only editors approve or send back', () => {
    expect(canTransition('reporter', 'draft', 'review')).toBe(true);
    expect(canTransition('reporter', 'review', 'approved')).toBe(false);
    expect(canTransition('editor', 'review', 'approved')).toBe(true);
    expect(canTransition('editor', 'review', 'draft')).toBe(true);
    expect(canTransition('editor', 'approved', 'review')).toBe(true);
    expect(canTransition('designer', 'draft', 'review')).toBe(false);
    expect(canTransition('editor', 'draft', 'approved')).toBe(false);
    expect(nextStatuses('editor', 'review')).toEqual(['draft', 'approved']);
    expect(nextStatuses('designer', 'review')).toEqual([]);
  });

  it('decides who may change the text', () => {
    expect(canEditText('reporter', 'draft')).toBe(true);
    expect(canEditText('reporter', 'review')).toBe(false);
    expect(canEditText('editor', 'review')).toBe(true);
    expect(canEditText('editor', 'approved')).toBe(false);
    expect(canEditText('designer', 'draft')).toBe(false);
  });

  it('treats stories from before the workflow as drafts', () => {
    expect(statusOf(story())).toBe('draft');
  });
});

describe('moving a story through review', () => {
  it('takes a story from draft to approved, keeping history and a copy of the text', async () => {
    const s = await setup();
    const review = await s.change.execute({ id: 'a1', to: 'review', actor: reporter });
    expect(review.status).toBe('review');
    expect(review.versions).toHaveLength(1);
    expect(review.notes?.[0]).toMatchObject({ system: true, text: 'draft → review', author: 'Asha' });

    const approved = await s.change.execute({ id: 'a1', to: 'approved', actor: editor });
    expect(approved.status).toBe('approved');
    expect(approved.notes).toHaveLength(2);
    // The text did not change, so no second copy was made.
    expect(approved.versions).toHaveLength(1);
  });

  it('refuses moves the role may not make', async () => {
    const s = await setup(story({ status: 'review' }));
    await expect(s.change.execute({ id: 'a1', to: 'approved', actor: reporter })).rejects.toBeInstanceOf(WorkflowError);
    await expect(s.change.execute({ id: 'a1', to: 'approved', actor: designer })).rejects.toBeInstanceOf(WorkflowError);
  });

  it('needs a reason to send a story back, and records it as an open comment', async () => {
    const s = await setup(story({ status: 'review' }));
    await expect(s.change.execute({ id: 'a1', to: 'draft', actor: editor })).rejects.toThrow('what needs changing');
    const back = await s.change.execute({ id: 'a1', to: 'draft', actor: editor, note: '  Check the figures  ' });
    expect(back.status).toBe('draft');
    expect(back.notes?.at(-1)).toMatchObject({ text: 'Check the figures', resolved: false, role: 'editor' });
  });
});

describe('editing and comments', () => {
  it('blocks edits by a role that may not change the story, but not edits without an actor', async () => {
    const s = await setup(story({ status: 'approved' }));
    await expect(s.update.execute({ id: 'a1', patch: { headline: 'X' }, actor: editor })).rejects.toBeInstanceOf(WorkflowError);
    await expect(s.update.execute({ id: 'a1', patch: { headline: 'X' }, actor: designer })).rejects.toBeInstanceOf(WorkflowError);
    expect((await s.update.execute({ id: 'a1', patch: { headline: 'Y' } })).headline).toBe('Y');
  });

  it('lets everyone comment and lets comments be resolved, but not history lines', async () => {
    const s = await setup();
    const withNote = await s.note.execute({ id: 'a1', actor: designer, text: ' Needs a shorter headline ' });
    const comment = withNote.notes?.[0];
    expect(comment).toMatchObject({ text: 'Needs a shorter headline', resolved: false, role: 'designer' });
    await expect(s.note.execute({ id: 'a1', actor: designer, text: '   ' })).rejects.toBeInstanceOf(WorkflowError);

    const done = await s.resolve.execute({ id: 'a1', noteId: comment?.id ?? '', resolved: true });
    expect(done.notes?.[0]?.resolved).toBe(true);

    const reviewed = await s.change.execute({ id: 'a1', to: 'review', actor: reporter });
    const history = reviewed.notes?.find((n) => n.system);
    await expect(s.resolve.execute({ id: 'a1', noteId: history?.id ?? '', resolved: false })).rejects.toThrow('History');
  });
});

describe('versions', () => {
  it('saves a copy, skips a repeat, and restores an earlier one while keeping the current text', async () => {
    const s = await setup();
    const first = await s.save.execute({ id: 'a1', actor: reporter, label: 'first cut' });
    expect(first.versions).toHaveLength(1);
    expect((await s.save.execute({ id: 'a1', actor: reporter })).versions).toHaveLength(1);

    await s.update.execute({ id: 'a1', patch: { headline: 'Second', dateline: 'Hyderabad:' } });
    const restored = await s.restore.execute({
      id: 'a1',
      versionId: first.versions?.[0]?.id ?? '',
      actor: reporter,
    });
    expect(restored.headline).toBe('First');
    expect(restored.dateline).toBeUndefined();
    expect(restored.versions).toHaveLength(2);
    expect(restored.versions?.at(-1)).toMatchObject({ headline: 'Second', label: 'before restore' });
  });

  it('does not restore into a story the role may not change', async () => {
    const s = await setup(story({ status: 'approved' }));
    const saved = await s.save.execute({ id: 'a1', actor: editor });
    await expect(
      s.restore.execute({ id: 'a1', versionId: saved.versions?.[0]?.id ?? '', actor: editor }),
    ).rejects.toBeInstanceOf(WorkflowError);
  });

  it('keeps only the most recent versions', async () => {
    const s = await setup();
    for (let i = 0; i < MAX_VERSIONS + 5; i += 1) {
      await s.update.execute({ id: 'a1', patch: { headline: `H${i}` } });
      await s.save.execute({ id: 'a1', actor: reporter });
    }
    const kept = (await s.articles.getById('a1')).versions ?? [];
    expect(kept).toHaveLength(MAX_VERSIONS);
    expect(kept.at(-1)?.headline).toBe(`H${MAX_VERSIONS + 4}`);
  });
});
