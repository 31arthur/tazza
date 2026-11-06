import { useState } from 'react';
import { GripVertical } from 'lucide-react';
import { detectLanguage } from '@domain/services/detectLanguage';
import { ArticleView } from '../../print/ArticleView';
import { ElementView } from '../../print/ElementView';
import { LeafFrame } from '../../print/LeafFrame';
import type { RenderLeafArgs } from '../../print/PageRenderer';
import type { DragSource } from './useLayoutDnd';

const elementLabel = (el: NonNullable<RenderLeafArgs['placed']['leaf']['element']>): string => {
  switch (el.type) {
    case 'photo':
      return el.caption || 'Photo';
    case 'text':
      return el.heading || 'Text box';
    case 'label':
      return el.text || 'Label';
    case 'ad':
      return 'Advertisement';
  }
};

interface Props extends RenderLeafArgs {
  selected: boolean;
  dragging: boolean;
  overflowText: string;
  emptyText: string;
  onSelect: () => void;
  onStartDrag: (event: React.PointerEvent, source: DragSource) => void;
}

/** A tile on the layout canvas: click to select, drag the story to move it. */
export function EditableLeaf({
  placed,
  article,
  slice,
  selected,
  dragging,
  overflowText,
  emptyText,
  onSelect,
  onStartDrag,
}: Props) {
  const [overflowing, setOverflowing] = useState(false);
  const { leaf } = placed;

  return (
    <LeafFrame
      placed={placed}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect();
        if (article) {
          onStartDrag(e, {
            articleId: article.id,
            fromLeafId: leaf.id,
            label: article.headline.trim() || '…',
          });
        } else if (leaf.element) {
          onStartDrag(e, { fromLeafId: leaf.id, label: elementLabel(leaf.element) });
        }
      }}
      style={{
        cursor: article || leaf.element ? 'grab' : 'default',
        outline: selected ? '0.7mm solid #2563eb' : '0.2mm dashed #94a3b8',
        outlineOffset: '-0.2mm',
        opacity: dragging ? 0.4 : 1,
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      {article && !slice?.orphan ? (
        <ArticleView
          article={article}
          cols={placed.cols}
          leaf={leaf}
          slice={slice}
          onOverflowChange={setOverflowing}
        />
      ) : leaf.element ? (
        <ElementView element={leaf.element} cols={placed.cols} leaf={leaf} />
      ) : (
        <div
          style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            fontFamily: 'var(--font-ui)',
            fontSize: '9pt',
            textAlign: 'center',
            border: '0.4mm dashed #cbd5e1',
          }}
        >
          {emptyText}
        </div>
      )}
      {(article || leaf.element) && selected && (
        <GripVertical
          aria-hidden
          style={{ position: 'absolute', top: '1mm', right: '1mm', width: '5mm', height: '5mm', color: '#2563eb' }}
        />
      )}
      {overflowing && (
        <div
          role="alert"
          lang={detectLanguage(overflowText)}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: '#dc2626',
            color: '#fff',
            fontFamily: 'var(--font-ui)',
            fontSize: '8pt',
            padding: '0.6mm 1.5mm',
            textAlign: 'center',
          }}
        >
          {overflowText}
        </div>
      )}
    </LeafFrame>
  );
}
