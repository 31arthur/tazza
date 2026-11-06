import type { Edition } from '../../entities/Edition';
import { NotFoundError } from '../../errors/DomainError';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';

export class RemoveBlock {
  constructor(private readonly editions: EditionRepository) {}

  async execute({
    editionId,
    blockId,
  }: {
    editionId: string;
    blockId: string;
  }): Promise<Edition> {
    const edition = await this.editions.find(editionId);
    if (!edition) throw new NotFoundError(`Edition ${editionId} not found`);
    const updated: Edition = {
      ...edition,
      pages: edition.pages.map((p) => ({ ...p, blocks: p.blocks.filter((b) => b.id !== blockId) })),
    };
    await this.editions.save(updated);
    return updated;
  }
}
