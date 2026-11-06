import { useState } from 'react';
import { Node } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';
import { detectLanguage } from '@domain/services/detectLanguage';
import type { ImageAdjust } from '@domain/entities/ImageAdjust';
import { useTranslation } from 'react-i18next';
import { AssetImage } from '../../../print/AssetImage';
import { ImageAdjustPanel } from '../../assets/ImageAdjustPanel';

function ImageNodeView({ node, updateAttributes, selected }: NodeViewProps) {
  const assetId = String(node.attrs['assetId'] ?? '');
  const caption = String(node.attrs['caption'] ?? '');
  const credit = String(node.attrs['credit'] ?? '');
  const adjust = (node.attrs['adjust'] ?? undefined) as Partial<ImageAdjust> | undefined;
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const field = 'w-full border-0 border-b border-transparent bg-transparent text-sm text-neutral-600 outline-none focus:border-neutral-300';
  return (
    <NodeViewWrapper as="figure" className="my-4" data-drag-handle>
      <div className={selected ? 'outline-2 outline-offset-2 outline-blue-500' : ''}>
        <AssetImage assetId={assetId} adjust={adjust} fit="contain" style={{ maxHeight: '28rem' }} />
      </div>
      <input
        type="text"
        value={caption}
        lang={detectLanguage(caption)}
        placeholder={t('elements.caption')}
        onChange={(e) => updateAttributes({ caption: e.target.value })}
        className={`mt-1 italic ${field}`}
      />
      <input
        type="text"
        value={credit}
        lang={detectLanguage(credit)}
        placeholder={t('photos.credit')}
        onChange={(e) => updateAttributes({ credit: e.target.value })}
        className={field}
      />
      <button type="button" className="mt-1 text-xs text-blue-600 hover:underline" onClick={() => setOpen(!open)}>
        {t('adjust.title')}
      </button>
      {open && (
        <div className="mt-2 max-w-xs" contentEditable={false}>
          <ImageAdjustPanel
            assetId={assetId}
            adjust={adjust}
            onChange={(next) => updateAttributes({ adjust: next ?? null })}
          />
        </div>
      )}
    </NodeViewWrapper>
  );
}

/** Image block that points at a stored asset; the bytes never live in the document. */
export const ImageNode = Node.create({
  name: 'image',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      assetId: { default: null },
      caption: { default: '' },
      credit: { default: '' },
      adjust: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: 'figure[data-asset-id]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['figure', { 'data-asset-id': HTMLAttributes['assetId'] }];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});
