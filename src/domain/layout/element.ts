import type { ImageAdjust } from '../entities/ImageAdjust';
import type { LeafStyle } from './style';
import type { SlotRole } from './tree';

/**
 * Things other than stories that a page is built from: a photo with a caption, a free text
 * box, a sidebar, a section label strip, and an ad placeholder. They are tiles like stories,
 * so they can be dragged, swapped, resized and styled the same way.
 */
export type ElementKind = 'photo' | 'text' | 'sidebar' | 'label' | 'ad';
export const ELEMENT_KINDS: readonly ElementKind[] = ['photo', 'text', 'sidebar', 'label', 'ad'];

export type Element =
  | {
      readonly type: 'photo';
      readonly assetId?: string;
      readonly caption: string;
      readonly credit?: string;
      readonly adjust?: Partial<ImageAdjust>;
    }
  | { readonly type: 'text'; readonly heading: string; readonly body: string }
  | { readonly type: 'label'; readonly text: string }
  | { readonly type: 'ad'; readonly note: string };

export interface ElementDefaults {
  readonly element: Element;
  readonly role: SlotRole;
  readonly style: Partial<LeafStyle>;
}

/** What a freshly added element looks like. Sidebars are text boxes in the boxed, tinted style. */
export const elementDefaults = (kind: ElementKind): ElementDefaults => {
  switch (kind) {
    case 'photo':
      return { element: { type: 'photo', caption: '' }, role: 'story', style: { frame: 'none' } };
    case 'text':
      return {
        element: { type: 'text', heading: '', body: '' },
        role: 'story',
        style: { frame: 'rule' },
      };
    case 'sidebar':
      return {
        element: { type: 'text', heading: '', body: '' },
        role: 'box',
        style: { tint: 'yellow', accent: 'red' },
      };
    case 'label':
      return {
        element: { type: 'label', text: '' },
        role: 'brief',
        style: { frame: 'none', accent: 'red' },
      };
    case 'ad':
      return { element: { type: 'ad', note: '' }, role: 'story', style: { frame: 'none' } };
  }
};
