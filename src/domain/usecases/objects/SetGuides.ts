import { findPage, replacePage, type Edition } from '../../entities/Edition';
import { LayoutError, NotFoundError } from '../../errors/DomainError';
import type { Guide } from '../../layout/snapping';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import { GRID } from '../../services/PageGeometry';
import type { PageRef } from '../layout/support';

/** Replaces the ruler guides of a page. Guides must lie on the page. */
export class SetGuides {
  constructor(private readonly editions: EditionRepository) {}

  async execute(ref: PageRef & { guides: readonly Guide[] }): Promise<Edition> {
    const edition = await this.editions.find(ref.editionId);
    if (!edition) throw new NotFoundError(`Edition ${ref.editionId} not found`);
    const page = findPage(edition, ref.pageNumber);

    const valid = ref.guides.every(
      (g) => Number.isFinite(g.at) && g.at >= 0 && g.at <= (g.axis === 'x' ? GRID.pageWidthMm : GRID.pageHeightMm),
    );
    if (!valid) throw new LayoutError('Guides must lie on the page');

    const updated = replacePage(edition, { ...page, guides: ref.guides });
    await this.editions.save(updated);
    return updated;
  }
}
