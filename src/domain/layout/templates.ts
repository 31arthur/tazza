import type { IdGenerator } from '../ports/services/IdGenerator';
import { GRID } from '../services/PageGeometry';
import { makeLeaf, type LayoutNode, type SlotRole } from './tree';

export const TEMPLATE_IDS = [
  'front',
  'front-5',
  'front-3',
  'inner-6',
  'inner-4',
  'inner-2',
  'blank',
] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

type Spec =
  | { slot: SlotRole; priority: number }
  | { row: readonly Spec[]; sizes: readonly number[] }
  | { col: readonly Spec[] };

const slot = (role: SlotRole, priority: number): Spec => ({ slot: role, priority });
const row = (sizes: number[], ...items: Spec[]): Spec => ({ row: items, sizes });
const col = (...items: Spec[]): Spec => ({ col: items });

/** Page structures. Slot priority says which story goes where: 1 gets the most important one. */
const SPECS: Record<TemplateId, Spec> = {
  front: col(
    slot('banner', 1),
    row(
      [2, 2, 2],
      col(slot('story', 4), slot('box', 6)),
      slot('lead', 2),
      col(slot('story', 5), slot('brief', 7)),
    ),
    row([3, 3], slot('story', 3), slot('story', 8)),
  ),
  'front-5': col(
    slot('banner', 1),
    row([2, 2, 2], slot('lead', 2), slot('story', 3), col(slot('story', 4), slot('brief', 5))),
  ),
  'front-3': col(slot('banner', 1), row([3, 3], slot('story', 2), slot('story', 3))),
  'inner-6': col(
    row([4, 2], slot('lead', 1), col(slot('story', 3), slot('brief', 4))),
    row([2, 2, 2], slot('story', 2), slot('story', 5), slot('story', 6)),
  ),
  'inner-4': col(slot('lead', 1), row([2, 2, 2], slot('story', 2), slot('story', 3), slot('brief', 4))),
  'inner-2': col(slot('lead', 1), slot('story', 2)),
  blank: slot('story', 1),
};

export const slotCount = (id: TemplateId): number => {
  const count = (s: Spec): number =>
    'slot' in s ? 1 : 'row' in s ? s.row.reduce((n, c) => n + count(c), 0) : s.col.reduce((n, c) => n + count(c), 0);
  return count(SPECS[id]);
};

/** Builds an empty page layout (all slots unfilled) from a template. */
export function buildTemplate(id: TemplateId, ids: IdGenerator): LayoutNode {
  const build = (spec: Spec): LayoutNode => {
    if ('slot' in spec) return makeLeaf(ids.next(), spec.slot, undefined, spec.priority);
    if ('row' in spec) {
      return {
        kind: 'split',
        id: ids.next(),
        direction: 'row',
        children: spec.row.map(build),
        sizes: spec.sizes,
      };
    }
    return {
      kind: 'split',
      id: ids.next(),
      direction: 'column',
      children: spec.col.map(build),
      sizes: spec.col.map(() => 1),
    };
  };
  return build(SPECS[id]);
}

/** Templates auto layout may choose for a page, fullest first. Front-page ones suit page 1 only. */
export const autoTemplateCandidates = (pageNumber: number): TemplateId[] =>
  TEMPLATE_IDS.filter((id) => pageNumber === 1 || !id.startsWith('front')).sort(
    (a, b) => slotCount(b) - slotCount(a),
  );

export const TEMPLATE_COLUMNS = GRID.columns;
