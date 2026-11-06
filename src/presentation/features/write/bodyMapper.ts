import type { JSONContent } from '@tiptap/core';
import type { ArticleBody, BodyNode, Inline, Mark } from '@domain/entities/Article';
import type { ImageAdjust } from '@domain/entities/ImageAdjust';

const MARKS: readonly Mark[] = ['bold', 'italic', 'underline'];
const isMark = (value: string): value is Mark => (MARKS as readonly string[]).includes(value);

/* ---------- ArticleBody -> TipTap ---------- */

const toTextNodes = (runs: readonly Inline[]): JSONContent[] =>
  runs
    .filter((r) => r.text !== '')
    .map((r) => ({
      type: 'text',
      text: r.text,
      ...(r.marks && r.marks.length > 0 && { marks: r.marks.map((type) => ({ type })) }),
    }));

const paragraph = (runs: readonly Inline[]): JSONContent => {
  const content = toTextNodes(runs);
  return content.length > 0 ? { type: 'paragraph', content } : { type: 'paragraph' };
};

const nodeToTiptap = (node: BodyNode): JSONContent => {
  switch (node.type) {
    case 'paragraph':
      return paragraph(node.children);
    case 'subhead':
      return { type: 'heading', attrs: { level: 3 }, content: toTextNodes(node.children) };
    case 'pullquote':
      return { type: 'blockquote', content: [paragraph(node.children)] };
    case 'list':
      return {
        type: node.ordered ? 'orderedList' : 'bulletList',
        content: node.items.map((item) => ({ type: 'listItem', content: [paragraph(item)] })),
      };
    case 'image':
      return {
        type: 'image',
        attrs: {
          assetId: node.assetId,
          caption: node.caption,
          credit: node.credit ?? '',
          adjust: node.adjust ?? null,
        },
      };
  }
};

export const bodyToTiptap = (body: ArticleBody): JSONContent => ({
  type: 'doc',
  content: body.length > 0 ? body.map(nodeToTiptap) : [{ type: 'paragraph' }],
});

/* ---------- TipTap -> ArticleBody ---------- */

const inlinesOf = (node: JSONContent | undefined): Inline[] =>
  (node?.content ?? []).flatMap((child): Inline[] => {
    if (child.type !== 'text' || child.text === undefined) return [];
    const marks = (child.marks ?? []).map((m) => m.type).filter(isMark);
    // NFC keeps Telugu in canonical form without touching what the writer sees while typing.
    const text = child.text.normalize('NFC');
    return marks.length > 0 ? [{ text, marks }] : [{ text }];
  });

const nodeFromTiptap = (node: JSONContent): BodyNode[] => {
  switch (node.type) {
    case 'paragraph':
      return [{ type: 'paragraph', children: inlinesOf(node) }];
    case 'heading':
      return [{ type: 'subhead', children: inlinesOf(node) }];
    case 'blockquote':
      return (node.content ?? []).map((p) => ({ type: 'pullquote', children: inlinesOf(p) }));
    case 'bulletList':
    case 'orderedList':
      return [
        {
          type: 'list',
          ordered: node.type === 'orderedList',
          items: (node.content ?? []).map((item) => (item.content ?? []).flatMap(inlinesOf)),
        },
      ];
    case 'image': {
      const assetId = node.attrs?.['assetId'];
      if (typeof assetId !== 'string') return [];
      const caption = node.attrs?.['caption'];
      const credit = node.attrs?.['credit'];
      const adjust = node.attrs?.['adjust'];
      return [
        {
          type: 'image',
          assetId,
          caption: typeof caption === 'string' ? caption : '',
          ...(typeof credit === 'string' && credit.trim() !== '' && { credit }),
          ...(adjust !== null && typeof adjust === 'object' && { adjust: adjust as Partial<ImageAdjust> }),
        },
      ];
    }
    default:
      return [];
  }
};

export const tiptapToBody = (doc: JSONContent): ArticleBody =>
  (doc.content ?? []).flatMap(nodeFromTiptap);
