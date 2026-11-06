import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { detectLanguage } from '@domain/services/detectLanguage';

/**
 * Tags every text block with lang="te" or lang="en" from the script it contains, so Telugu
 * paragraphs get Telugu line height and English ones do not. Writers never pick a language.
 */
export const LanguageAttr = Extension.create({
  name: 'languageAttr',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('languageAttr'),
        props: {
          decorations: (state) => {
            const decorations: Decoration[] = [];
            state.doc.descendants((node, pos) => {
              if (node.isTextblock) {
                decorations.push(
                  Decoration.node(pos, pos + node.nodeSize, {
                    lang: detectLanguage(node.textContent),
                  }),
                );
              }
            });
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
