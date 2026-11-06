import type { PageObject } from '../layout/objects';
import type { LeafStyle, Masthead } from '../layout/style';
import type { Guide } from '../layout/snapping';
import type { LayoutNode, SlotRole } from '../layout/tree';
import type { Master } from './Master';

/** A page's structure without its stories: tiles (with roles, styles, elements), objects, guides. */
export interface PageTemplateData {
  readonly layout: LayoutNode;
  readonly objects: readonly PageObject[];
  readonly guides: readonly Guide[];
  /** The master the page used. Only edition templates restore it (masters belong to an edition). */
  readonly masterId?: string;
}

interface Base {
  readonly id: string;
  readonly name: string;
  readonly createdAt: number;
}

/**
 * Things a newsroom reuses across editions. The library lives outside any one edition, so a
 * template saved today is available tomorrow.
 */
export type LibraryItem =
  | (Base & { readonly kind: 'pageTemplate'; readonly page: PageTemplateData })
  | (Base & {
      readonly kind: 'editionTemplate';
      readonly pages: readonly PageTemplateData[];
      readonly masters: readonly Master[];
      readonly masthead?: Partial<Masthead>;
    })
  | (Base & { readonly kind: 'tileStyle'; readonly role: SlotRole; readonly style: Partial<LeafStyle> })
  | (Base & { readonly kind: 'brandKit'; readonly masthead: Partial<Masthead> });

export type LibraryKind = LibraryItem['kind'];

/** There is one brand kit per publication; it always has this id. */
export const BRAND_KIT_ID = 'brand-kit';
