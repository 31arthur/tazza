import type { Article } from './Article';
import type { Asset } from './Asset';
import type { Edition } from './Edition';

export const BUNDLE_FORMAT = 'tazza-edition';
export const BUNDLE_VERSION = 1;

/**
 * Everything one day's paper needs, in one piece: the layout, the stories and the pictures they
 * use. It is a backup, a way to move work to another computer, and what the PDF exporter renders.
 */
export interface EditionBundle {
  readonly format: typeof BUNDLE_FORMAT;
  readonly version: number;
  readonly edition: Edition;
  readonly articles: readonly Article[];
  readonly assets: readonly { readonly asset: Asset; readonly blob: Blob }[];
}
