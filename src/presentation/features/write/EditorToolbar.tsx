import type { ComponentType } from 'react';
import type { Editor } from '@tiptap/react';
import { useEditorState } from '@tiptap/react';
import {
  Bold,
  Heading3,
  ImagePlus,
  Italic,
  Library,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Underline,
  Undo2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';
import { Separator } from '../../components/ui/separator';

interface Props {
  editor: Editor;
  onPickImage: () => void;
  onPickFromLibrary: () => void;
}

interface Item {
  key: string;
  icon: ComponentType<{ className?: string }>;
  active?: boolean;
  disabled?: boolean;
  run: () => void;
}

export function EditorToolbar({ editor, onPickImage, onPickFromLibrary }: Props) {
  const { t } = useTranslation();
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      heading: e.isActive('heading'),
      quote: e.isActive('blockquote'),
      bullets: e.isActive('bulletList'),
      numbers: e.isActive('orderedList'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const groups: Item[][] = [
    [
      { key: 'bold', icon: Bold, active: state.bold, run: () => editor.chain().focus().toggleBold().run() },
      { key: 'italic', icon: Italic, active: state.italic, run: () => editor.chain().focus().toggleItalic().run() },
      { key: 'underline', icon: Underline, active: state.underline, run: () => editor.chain().focus().toggleUnderline().run() },
    ],
    [
      { key: 'subhead', icon: Heading3, active: state.heading, run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
      { key: 'quote', icon: Quote, active: state.quote, run: () => editor.chain().focus().toggleBlockquote().run() },
      { key: 'bullets', icon: List, active: state.bullets, run: () => editor.chain().focus().toggleBulletList().run() },
      { key: 'numbers', icon: ListOrdered, active: state.numbers, run: () => editor.chain().focus().toggleOrderedList().run() },
    ],
    [
      { key: 'image', icon: ImagePlus, run: onPickImage },
      { key: 'library', icon: Library, run: onPickFromLibrary },
    ],
    [
      { key: 'undo', icon: Undo2, disabled: !state.canUndo, run: () => editor.chain().focus().undo().run() },
      { key: 'redo', icon: Redo2, disabled: !state.canRedo, run: () => editor.chain().focus().redo().run() },
    ],
  ];

  return (
    <div
      role="toolbar"
      className="flex flex-wrap items-center gap-1"
    >
      {groups.map((group, gi) => (
        <div key={gi} className="flex items-center gap-1">
          {gi > 0 && <Separator orientation="vertical" className="mx-1 h-6" />}
          {group.map(({ key, icon: Icon, active, disabled, run }) => (
            <Button
              key={key}
              type="button"
              variant={active ? 'secondary' : 'ghost'}
              size="icon"
              aria-pressed={active ?? false}
              aria-label={t(`toolbar.${key}`)}
              title={t(`toolbar.${key}`)}
              disabled={disabled ?? false}
              onMouseDown={(e) => e.preventDefault()}
              onClick={run}
            >
              <Icon className="size-4" />
            </Button>
          ))}
        </div>
      ))}
    </div>
  );
}
