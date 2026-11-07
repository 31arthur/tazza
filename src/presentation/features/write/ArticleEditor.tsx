import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { wordCount, bodyParagraphs, statusOf, type Article, type ArticlePatch } from '@domain/entities/Article';
import { canEditText } from '@domain/entities/Workflow';
import { detectLanguage } from '@domain/services/detectLanguage';
import { Input } from '../../components/ui/input';
import { cn } from '../../lib/utils';
import { useUseCases } from '../../hooks/AppContext';
import { isImageFile, prepareImage } from '../../lib/image';
import { AssetPicker } from '../assets/AssetPicker';
import { useActor } from '../../state/workStore';
import { articlesKey } from '../queries';
import { bodyToTiptap, tiptapToBody } from './bodyMapper';
import { EditorToolbar } from './EditorToolbar';
import { ImageNode } from './extensions/ImageNode';
import { LanguageAttr } from './extensions/LanguageAttr';
import { StatusBadge } from './StatusBadge';
import { useAutosave } from './useAutosave';
import { StoryCoach } from './StoryCoach';

interface Props {
  article: Article;
  /** Hides the side companion so only the page is left. */
  focus?: boolean;
}

const titleClass =
  'w-full resize-none border-0 bg-transparent p-0 outline-none field-sizing-content placeholder:text-neutral-300';

export function ArticleEditor({ article, focus = false }: Props) {
  const { t } = useTranslation();
  const { updateArticle, saveAsset } = useUseCases();
  const queryClient = useQueryClient();
  const actor = useActor();
  const readOnly = !canEditText(actor.role, statusOf(article));

  const save = useCallback(
    async (patch: ArticlePatch) => {
      await updateArticle.execute({ id: article.id, patch, actor });
      await queryClient.invalidateQueries({ queryKey: articlesKey(article.editionId) });
    },
    [updateArticle, article.id, article.editionId, queryClient, actor],
  );
  const { schedule, flush, status } = useAutosave<ArticlePatch>(save);

  const fileInput = useRef<HTMLInputElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const [picking, setPicking] = useState(false);

  const insertImage = useCallback(
    async (file: File) => {
      try {
        const prepared = await prepareImage(file);
        const asset = await saveAsset.execute({ ...prepared, name: file.name });
        editorRef.current
          ?.chain()
          .focus()
          .insertContent({ type: 'image', attrs: { assetId: asset.id } })
          .run();
      } catch {
        toast.error(t('write.imageFailed'));
      }
    },
    [saveAsset, t],
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [3] },
        hardBreak: false,
        link: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
      }),
      ImageNode,
      LanguageAttr,
    ],
    content: bodyToTiptap(article.body),
    editable: !readOnly,
    onUpdate: ({ editor: e }) => schedule({ body: tiptapToBody(e.getJSON()) }),
    editorProps: {
      handlePaste: (_view, event) => {
        const file = [...(event.clipboardData?.files ?? [])].find(isImageFile);
        if (!file) return false;
        void insertImage(file);
        return true;
      },
      handleDrop: (_view, event) => {
        const file = [...(event.dataTransfer?.files ?? [])].find(isImageFile);
        if (!file) return false;
        void insertImage(file);
        return true;
      },
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);

  const onFileChosen =(e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file && isImageFile(file)) void insertImage(file);
  };

  const words = wordCount(
    [article.headline, article.subHeadline, ...bodyParagraphs(article.body)].join(' '),
  );

  return (
    <div
      className={cn(
        'mx-auto grid items-start gap-8 px-6 py-8',
        focus ? 'max-w-3xl grid-cols-1' : 'max-w-6xl lg:grid-cols-[minmax(0,1fr)_18rem]',
      )}
    >
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground" aria-live="polite">
          <span className="flex items-center gap-2">
            <StatusBadge status={statusOf(article)} />
            {t('write.words', { count: words })}
            {readOnly && <span>· {t('workflow.readOnly')}</span>}
          </span>
          <span>{t(`save.${status}`)}</span>
        </div>

        <div className="paper rounded-xl border bg-white shadow-sm">
          {editor && !readOnly && (
            <div className="sticky top-0 z-10 rounded-t-xl border-b bg-white/95 p-1.5 backdrop-blur">
              <EditorToolbar
                editor={editor}
                onPickImage={() => fileInput.current?.click()}
                onPickFromLibrary={() => setPicking(true)}
              />
            </div>
          )}
          <div className="flex flex-col gap-2 px-8 pt-8">
            <textarea
              rows={1}
              defaultValue={article.headline}
              lang={detectLanguage(article.headline)}
              placeholder={t('write.headline')}
              aria-label={t('write.headline')}
              readOnly={readOnly}
              onChange={(e) => schedule({ headline: e.target.value })}
              className={`${titleClass} headline text-4xl`}
              style={{ lineHeight: 1.3 }}
            />
            <textarea
              rows={1}
              defaultValue={article.subHeadline}
              lang={detectLanguage(article.subHeadline)}
              placeholder={t('write.subHeadline')}
              aria-label={t('write.subHeadline')}
              readOnly={readOnly}
              onChange={(e) => schedule({ subHeadline: e.target.value })}
              className={`${titleClass} text-xl font-semibold text-neutral-600`}
              style={{ lineHeight: 1.5 }}
            />
            <div className="grid grid-cols-2 gap-4 border-y py-1">
              <Input
                defaultValue={article.dateline ?? ''}
                lang={detectLanguage(article.dateline ?? '')}
                placeholder={t('write.dateline')}
                aria-label={t('write.dateline')}
                readOnly={readOnly}
                onChange={(e) => schedule({ dateline: e.target.value })}
                className="h-8 border-0 bg-transparent px-0 text-sm font-semibold shadow-none focus-visible:ring-0"
              />
              <Input
                defaultValue={article.byline}
                lang={detectLanguage(article.byline)}
                placeholder={t('write.byline')}
                aria-label={t('write.byline')}
                readOnly={readOnly}
                onChange={(e) => schedule({ byline: e.target.value })}
                className="h-8 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
              />
            </div>
          </div>
          <div className="editor-surface min-h-96 px-8 pb-10 pt-4">
            <EditorContent editor={editor} aria-label={t('write.body')} />
          </div>
        </div>

        {picking && (
          <AssetPicker
            onClose={() => setPicking(false)}
            onPick={(asset) =>
              editorRef.current
                ?.chain()
                .focus()
                .insertContent({
                  type: 'image',
                  attrs: { assetId: asset.id, caption: asset.caption ?? '', credit: asset.credit ?? '' },
                })
                .run()
            }
          />
        )}
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChosen}
          aria-hidden
          tabIndex={-1}
        />
      </div>
      {!focus && <StoryCoach article={article} flush={flush} />}
    </div>
  );
}
