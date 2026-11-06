import { useCallback, useEffect, useRef, type ChangeEvent } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { wordCount, bodyParagraphs, type Article, type ArticlePatch } from '@domain/entities/Article';
import { detectLanguage } from '@domain/services/detectLanguage';
import { Input } from '../../components/ui/input';
import { useUseCases } from '../../hooks/AppContext';
import { isImageFile, prepareImage } from '../../lib/image';
import { articlesKey } from '../queries';
import { bodyToTiptap, tiptapToBody } from './bodyMapper';
import { EditorToolbar } from './EditorToolbar';
import { ImageNode } from './extensions/ImageNode';
import { LanguageAttr } from './extensions/LanguageAttr';
import { useAutosave } from './useAutosave';

interface Props {
  article: Article;
}

const titleClass =
  'w-full resize-none border-0 bg-transparent p-0 outline-none field-sizing-content placeholder:text-neutral-300';

export function ArticleEditor({ article }: Props) {
  const { t } = useTranslation();
  const { updateArticle, saveAsset } = useUseCases();
  const queryClient = useQueryClient();

  const save = useCallback(
    async (patch: ArticlePatch) => {
      await updateArticle.execute({ id: article.id, patch });
      await queryClient.invalidateQueries({ queryKey: articlesKey(article.editionId) });
    },
    [updateArticle, article.id, article.editionId, queryClient],
  );
  const { schedule, status } = useAutosave<ArticlePatch>(save);

  const fileInput = useRef<HTMLInputElement>(null);
  const editorRef = useRef<Editor | null>(null);

  const insertImage = useCallback(
    async (file: File) => {
      try {
        const prepared = await prepareImage(file);
        const asset = await saveAsset.execute(prepared);
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

  const onFileChosen =(e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file && isImageFile(file)) void insertImage(file);
  };

  const words = wordCount(
    [article.headline, article.subHeadline, ...bodyParagraphs(article.body)].join(' '),
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
      <div className="flex items-center justify-between text-xs text-muted-foreground" aria-live="polite">
        <span>{t('write.words', { count: words })}</span>
        <span>{t(`save.${status}`)}</span>
      </div>

      <div className="paper flex flex-col gap-2 rounded-md border bg-white p-6 shadow-sm">
        <textarea
          rows={1}
          defaultValue={article.headline}
          lang={detectLanguage(article.headline)}
          placeholder={t('write.headline')}
          aria-label={t('write.headline')}
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
          onChange={(e) => schedule({ subHeadline: e.target.value })}
          className={`${titleClass} text-xl font-semibold text-neutral-700`}
          style={{ lineHeight: 1.5 }}
        />
        <Input
          defaultValue={article.dateline ?? ''}
          lang={detectLanguage(article.dateline ?? '')}
          placeholder={t('write.dateline')}
          aria-label={t('write.dateline')}
          onChange={(e) => schedule({ dateline: e.target.value })}
          className="h-8 border-0 border-b bg-transparent px-0 text-sm font-semibold shadow-none focus-visible:ring-0"
        />
        <Input
          defaultValue={article.byline}
          lang={detectLanguage(article.byline)}
          placeholder={t('write.byline')}
          aria-label={t('write.byline')}
          onChange={(e) => schedule({ byline: e.target.value })}
          className="h-8 border-0 border-b bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
        />
      </div>

      {editor && <EditorToolbar editor={editor} onPickImage={() => fileInput.current?.click()} />}
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChosen}
        aria-hidden
        tabIndex={-1}
      />

      <div className="paper editor-surface min-h-96 rounded-md border bg-white p-6 shadow-sm">
        <EditorContent editor={editor} aria-label={t('write.body')} />
      </div>
    </div>
  );
}
