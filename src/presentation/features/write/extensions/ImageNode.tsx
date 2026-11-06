import { Node } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';
import { detectLanguage } from '@domain/services/detectLanguage';
import { AssetImage } from '../../../print/AssetImage';

function ImageNodeView({ node, updateAttributes, selected }: NodeViewProps) {
  const assetId = String(node.attrs['assetId'] ?? '');
  const caption = String(node.attrs['caption'] ?? '');
  return (
    <NodeViewWrapper as="figure" className="my-4" data-drag-handle>
      <div className={selected ? 'outline-2 outline-offset-2 outline-blue-500' : ''}>
        <AssetImage assetId={assetId} style={{ maxHeight: '28rem', objectFit: 'contain' }} />
      </div>
      <input
        type="text"
        value={caption}
        lang={detectLanguage(caption)}
        placeholder="Caption / credit"
        onChange={(e) => updateAttributes({ caption: e.target.value })}
        className="mt-1 w-full border-0 border-b border-transparent bg-transparent text-sm italic text-neutral-600 outline-none focus:border-neutral-300"
      />
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
    return { assetId: { default: null }, caption: { default: '' } };
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
