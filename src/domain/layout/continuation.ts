import type { Edition } from '../entities/Edition';
import { mapLeaves, type Leaf } from './tree';

/**
 * Re-links the neighbours of a tile so a chain of continued tiles stays unbroken when that tile
 * leaves it: the tile before now continues straight into the tile after, and vice versa.
 */
export function bridgeOver(edition: Edition, leaf: Leaf): Edition {
  const patch = (l: Leaf): Leaf => {
    if (l.continuesFrom === leaf.id) {
      const { continuesFrom: _gone, ...rest } = l;
      return leaf.continuesFrom !== undefined ? { ...rest, continuesFrom: leaf.continuesFrom } : rest;
    }
    if (l.continuesTo === leaf.id) {
      const { continuesTo: _gone, ...rest } = l;
      return leaf.continuesTo !== undefined ? { ...rest, continuesTo: leaf.continuesTo } : rest;
    }
    return l;
  };
  return {
    ...edition,
    pages: edition.pages.map((p) => ({ ...p, layout: mapLeaves(p.layout, patch) })),
  };
}
