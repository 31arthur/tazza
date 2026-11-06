import type { Article } from '../entities/Article';
import type { Edition } from '../entities/Edition';
import { leavesOf } from '../layout/tree';
import type { PageObject } from '../layout/objects';

const objectAsset = (o: PageObject): string | undefined =>
  o.kind === 'image' ? o.assetId : undefined;

/**
 * How many places use each photo: story images, photo boxes, image frames and the objects on
 * masters. Used to warn before a photo is deleted.
 */
export const countAssetUsage = (
  articles: readonly Article[],
  editions: readonly Edition[],
): Map<string, number> => {
  const counts = new Map<string, number>();
  const add = (id: string | undefined) => {
    if (id !== undefined) counts.set(id, (counts.get(id) ?? 0) + 1);
  };

  for (const article of articles) {
    for (const node of article.body) if (node.type === 'image') add(node.assetId);
  }
  for (const edition of editions) {
    for (const page of edition.pages) {
      for (const leaf of leavesOf(page.layout)) {
        if (leaf.element?.type === 'photo') add(leaf.element.assetId);
      }
      for (const o of page.objects ?? []) add(objectAsset(o));
    }
    for (const master of edition.masters ?? []) for (const o of master.objects) add(objectAsset(o));
  }
  return counts;
};

/** The photos one edition needs: its stories' images, photo boxes, image frames and masters. */
export const assetIdsUsedBy = (edition: Edition, articles: readonly Article[]): string[] => {
  const ids = new Set<string>();
  for (const [id] of countAssetUsage(articles, [edition])) ids.add(id);
  return [...ids];
};
