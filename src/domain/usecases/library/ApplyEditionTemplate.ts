import type { Edition, Page } from '../../entities/Edition';
import { LayoutError } from '../../errors/DomainError';
import { fitPage } from '../../layout/fit';
import { reidentifyLayout, reidentifyObjects } from '../../layout/template';
import { normalize } from '../../layout/tree';
import type { ArticleRepository } from '../../ports/repositories/ArticleRepository';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import type { LibraryRepository } from '../../ports/repositories/LibraryRepository';
import type { IdGenerator } from '../../ports/services/IdGenerator';
import { loadLayoutContext } from '../layout/support';

/**
 * Rebuilds an edition from a saved edition template: its pages, masters and masthead. The
 * edition's stories stay as they are but become unplaced, ready for Auto layout.
 */
export class ApplyEditionTemplate {
  constructor(
    private readonly articles: ArticleRepository,
    private readonly editions: EditionRepository,
    private readonly library: LibraryRepository,
    private readonly ids: IdGenerator,
  ) {}

  async execute(input: { editionId: string; templateId: string }): Promise<Edition> {
    const item = (await this.library.list()).find((i) => i.id === input.templateId);
    if (item?.kind !== 'editionTemplate') throw new LayoutError('Edition template not found');

    const { edition, lookup } = await loadLayoutContext(
      this.articles,
      this.editions,
      input.editionId,
    );

    const pages: Page[] = item.pages.map((data, i) => ({
      number: i + 1,
      layout: fitPage(normalize(reidentifyLayout(data.layout, this.ids)), i + 1, lookup),
      objects: reidentifyObjects(data.objects, this.ids),
      guides: data.guides,
      ...(data.masterId !== undefined && { masterId: data.masterId }),
    }));

    // Masters keep their ids so pages that point at them (none yet) stay consistent.
    const { masthead: _old, ...rest } = edition;
    const updated: Edition = {
      ...rest,
      pages,
      masters: item.masters,
      ...(item.masthead && { masthead: item.masthead }),
    };
    await this.editions.save(updated);
    return updated;
  }
}
