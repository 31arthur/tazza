import { findPage, replacePage, type Edition } from '../../entities/Edition';
import { LayoutError, NotFoundError } from '../../errors/DomainError';
import type { PageObject } from '../../layout/objects';
import { expandGroups } from '../../layout/selection';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import type { PageRef } from '../layout/support';

export const requireObject = (objects: readonly PageObject[], id: string): PageObject => {
  const found = objects.find((o) => o.id === id);
  if (!found) throw new LayoutError('Object not found');
  return found;
};

/** The chosen objects plus the rest of their groups, in stacking order. Throws if one is missing. */
export const selectionOf = (
  objects: readonly PageObject[],
  ids: readonly string[],
): PageObject[] => {
  ids.forEach((id) => requireObject(objects, id));
  const all = new Set(expandGroups(objects, ids));
  return objects.filter((o) => all.has(o.id));
};

/** Loads an edition, replaces one page's free objects, and saves. */
export async function changePageObjects(
  editions: EditionRepository,
  { editionId, pageNumber }: PageRef,
  change: (objects: readonly PageObject[]) => readonly PageObject[],
): Promise<Edition> {
  const edition = await editions.find(editionId);
  if (!edition) throw new NotFoundError(`Edition ${editionId} not found`);
  const page = findPage(edition, pageNumber);
  const updated = replacePage(edition, { ...page, objects: change(page.objects ?? []) });
  await editions.save(updated);
  return updated;
}
