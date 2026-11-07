import type { ArticleBody } from './Article';

/** Where a story is on its way from the reporter's desk to the page. */
export type ArticleStatus = 'draft' | 'review' | 'approved';
export const ARTICLE_STATUSES: readonly ArticleStatus[] = ['draft', 'review', 'approved'];

/** The hat someone is wearing. Tazza is local-first, so this is a working role, not a login. */
export type Role = 'reporter' | 'editor' | 'designer';
export const ROLES: readonly Role[] = ['reporter', 'editor', 'designer'];

export interface Actor {
  readonly name: string;
  readonly role: Role;
}

/** A comment on a story, or a line of its history written by the system. */
export interface ArticleNote {
  readonly id: string;
  readonly author: string;
  readonly role: Role;
  readonly text: string;
  readonly at: number;
  readonly resolved: boolean;
  /** True for lines the app wrote itself (status changes), which cannot be resolved. */
  readonly system?: boolean;
}

/** A saved copy of a story's text, to go back to. */
export interface ArticleVersion {
  readonly id: string;
  readonly at: number;
  readonly author: string;
  readonly label: string;
  readonly headline: string;
  readonly subHeadline: string;
  readonly byline: string;
  readonly dateline?: string;
  readonly body: ArticleBody;
}

export const MAX_VERSIONS = 20;

/** Who may move a story from one status to another. */
const TRANSITIONS: Readonly<Record<ArticleStatus, Partial<Record<ArticleStatus, readonly Role[]>>>> = {
  draft: { review: ['reporter', 'editor'] },
  review: { approved: ['editor'], draft: ['editor'] },
  approved: { review: ['editor'] },
};

export const canTransition = (role: Role, from: ArticleStatus, to: ArticleStatus): boolean =>
  TRANSITIONS[from][to]?.includes(role) ?? false;

/** The statuses `role` can move a story to from `from`. */
export const nextStatuses = (role: Role, from: ArticleStatus): ArticleStatus[] =>
  ARTICLE_STATUSES.filter((to) => canTransition(role, from, to));

/**
 * Who may change a story's text: reporters while it is a draft, editors until it is approved
 * (reopen it to change it again), designers never. Comments are open to everyone.
 */
export const canEditText = (role: Role, status: ArticleStatus): boolean =>
  (role === 'reporter' && status === 'draft') ||
  (role === 'editor' && status !== 'approved');

/** The places in the app a person can go. */
export type Area = 'write' | 'newsroom' | 'studio' | 'publish' | 'photos' | 'templates';

const ACCESS: Readonly<Record<Role, readonly Area[]>> = {
  reporter: ['write', 'photos', 'publish'],
  editor: ['write', 'newsroom', 'studio', 'publish', 'photos', 'templates'],
  designer: ['newsroom', 'studio', 'publish', 'photos', 'templates'],
};

export const canOpen = (role: Role, area: Area): boolean => ACCESS[role].includes(area);

export const areasFor = (role: Role): readonly Area[] => ACCESS[role];

/** Where each role starts the day: authors write, editors review, designers arrange. */
export const landingFor = (role: Role): Area =>
  role === 'reporter' ? 'write' : role === 'editor' ? 'newsroom' : 'studio';
