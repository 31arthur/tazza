import { assertPlacementValid, findPage, replacePage, type Edition } from '../../entities/Edition';
import { LayoutError, NotFoundError } from '../../errors/DomainError';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import type { GridPlacement } from '../../services/PageGeometry';

/** Moves or resizes a block, rejecting placements that leave the grid or overlap. */
export class UpdateBlock {
  constructor(private readonly editions: EditionRepository) {}

  async execute({
    editionId,
    pageNumber,
    blockId,
    placement,
  }: {
    editionId: string;
    pageNumber: number;
    blockId: string;
    placement: GridPlacement;
  }): Promise<Edition> {
    const edition = await this.editions.find(editionId);
    if (!edition) throw new NotFoundError(`Edition ${editionId} not found`);
    const page = findPage(edition, pageNumber);
    if (!page.blocks.some((b) => b.id === blockId)) throw new LayoutError('Block not found');

    assertPlacementValid(page, placement, blockId);
    const updated = replacePage(edition, {
      ...page,
      blocks: page.blocks.map((b) => (b.id === blockId ? { ...b, placement } : b)),
    });
    await this.editions.save(updated);
    return updated;
  }
}
