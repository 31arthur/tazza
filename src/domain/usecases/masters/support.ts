import type { Edition } from '../../entities/Edition';
import type { Master } from '../../entities/Master';
import { LayoutError, NotFoundError } from '../../errors/DomainError';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';

export const mastersOf = (edition: Edition): readonly Master[] => edition.masters ?? [];

export async function requireEdition(editions: EditionRepository, id: string): Promise<Edition> {
  const edition = await editions.find(id);
  if (!edition) throw new NotFoundError(`Edition ${id} not found`);
  return edition;
}

export const requireMaster = (edition: Edition, masterId: string): Master => {
  const found = mastersOf(edition).find((m) => m.id === masterId);
  if (!found) throw new LayoutError('Master not found');
  return found;
};
