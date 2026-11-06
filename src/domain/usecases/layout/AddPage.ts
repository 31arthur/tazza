import type { Edition } from '../../entities/Edition';
import { NotFoundError } from '../../errors/DomainError';
import { buildTemplate, type TemplateId } from '../../layout/templates';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import type { IdGenerator } from '../../ports/services/IdGenerator';

export class AddPage {
  constructor(
    private readonly editions: EditionRepository,
    private readonly ids: IdGenerator,
  ) {}

  async execute({
    editionId,
    templateId = 'inner-6',
  }: {
    editionId: string;
    templateId?: TemplateId;
  }): Promise<Edition> {
    const edition = await this.editions.find(editionId);
    if (!edition) throw new NotFoundError(`Edition ${editionId} not found`);
    const updated: Edition = {
      ...edition,
      pages: [
        ...edition.pages,
        { number: edition.pages.length + 1, layout: buildTemplate(templateId, this.ids) },
      ],
    };
    await this.editions.save(updated);
    return updated;
  }
}
