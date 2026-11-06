import type { Page } from '../entities/Edition';
import type { PageTemplateData } from '../entities/LibraryItem';
import type { IdGenerator } from '../ports/services/IdGenerator';
import type { PageObject } from './objects';
import { leavesOf, mapLeaves, type LayoutNode } from './tree';

/**
 * Removes the stories from a layout, keeping the structure, roles, styles and any elements.
 * Empty slots get a priority by reading order so a template can be filled in order later.
 */
export const stripArticles = (layout: LayoutNode): LayoutNode => {
  const order = new Map(leavesOf(layout).map((l, i) => [l.id, i + 1]));
  return mapLeaves(layout, (leaf) => {
    const { articleId: _story, ...rest } = leaf;
    return { ...rest, priority: leaf.priority ?? order.get(leaf.id) ?? 99 };
  });
};

/** Gives every split and tile a fresh id, so a template can be used again and again. */
export const reidentifyLayout = (node: LayoutNode, ids: IdGenerator): LayoutNode =>
  node.kind === 'leaf'
    ? { ...node, id: ids.next() }
    : {
        ...node,
        id: ids.next(),
        children: node.children.map((c) => reidentifyLayout(c, ids)),
      };

/** Fresh ids for objects too; groups stay grouped under new group ids. */
export const reidentifyObjects = (
  objects: readonly PageObject[],
  ids: IdGenerator,
): PageObject[] => {
  const groups = new Map<string, string>();
  return objects.map((o) => {
    const { groupId, ...rest } = o;
    const next = groupId === undefined ? undefined : (groups.get(groupId) ?? ids.next());
    if (groupId !== undefined && next !== undefined) groups.set(groupId, next);
    return { ...rest, id: ids.next(), ...(next !== undefined && { groupId: next }) } as PageObject;
  });
};

/** What a page contributes to a template: its structure and objects, never its stories. */
export const pageToTemplate = (page: Page): PageTemplateData => ({
  layout: stripArticles(page.layout),
  objects: page.objects ?? [],
  guides: page.guides ?? [],
  ...(page.masterId !== undefined && { masterId: page.masterId }),
});
