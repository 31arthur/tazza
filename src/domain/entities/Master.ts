import type { PageObject } from '../layout/objects';

/**
 * A master holds objects that repeat on every page that uses it (a rule, a running label, a
 * watermark). Change the master once and all of its pages follow. Master objects are drawn
 * behind the page's own content.
 */
export interface Master {
  readonly id: string;
  readonly name: string;
  readonly objects: readonly PageObject[];
}
