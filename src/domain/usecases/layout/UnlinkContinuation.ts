import { findLeafInEdition, replacePage, type Edition } from '../../entities/Edition';
import { LayoutError } from '../../errors/DomainError';
import { bridgeOver } from '../../layout/continuation';
import { fitPage } from '../../layout/fit';
import {
  leavesOf,
  makeLeaf,
  mapLeaves,
  normalize,
  removeLeaf,
} from '../../layout/tree';
import type { ArticleRepository } from '../../ports/repositories/ArticleRepository';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import type { IdGenerator } from '../../ports/services/IdGenerator';
import { loadLayoutContext } from './support';

/**
 * Takes away the continuation of a story: the tile it carried on in is removed (its neighbours
 * grow into the space) and the text goes back into the original tile. If the story continued
 * through several tiles, the next one is joined on instead.
 */
export class UnlinkContinuation {
  constructor(
    private readonly articles: ArticleRepository,
    private readonly editions: EditionRepository,
    private readonly ids: IdGenerator,
  ) {}

  /** `leafId` is the tile whose continuation should go. */
  async execute({ editionId, leafId }: { editionId: string; leafId: string }): Promise<Edition> {
    const ctx = await loadLayoutContext(this.articles, this.editions, editionId);
    const follower = ctx.edition.pages
      .flatMap((p) => leavesOf(p.layout))
      .find((l) => l.continuesFrom === leafId);

    let edition: Edition;
    if (!follower) {
      // Nothing carries on from here; just clear any stale marker.
      if (!findLeafInEdition(ctx.edition, leafId)) throw new LayoutError('Tile not found');
      edition = {
        ...ctx.edition,
        pages: ctx.edition.pages.map((p) => ({
          ...p,
          layout: mapLeaves(p.layout, (l) => {
            if (l.id !== leafId) return l;
            const { continuesTo: _stale, ...rest } = l;
            return rest;
          }),
        })),
      };
    } else {
      edition = bridgeOver(ctx.edition, follower);
      const where = findLeafInEdition(edition, follower.id);
      if (where) {
        const reduced = removeLeaf(where.page.layout, follower.id) ?? makeLeaf(this.ids.next());
        edition = replacePage(edition, { ...where.page, layout: reduced });
      }
    }

    // Both ends may have changed size, so re-fit every page that holds either tile.
    const touched = new Set(
      edition.pages
        .filter((p) => leavesOf(p.layout).some((l) => l.id === leafId))
        .map((p) => p.number),
    );
    if (follower) {
      const where = ctx.edition.pages.find((p) => leavesOf(p.layout).some((l) => l.id === follower.id));
      if (where) touched.add(where.number);
    }
    for (const number of touched) {
      const page = edition.pages.find((p) => p.number === number);
      if (page) {
        edition = replacePage(edition, {
          ...page,
          layout: fitPage(normalize(page.layout), number, ctx.lookup),
        });
      }
    }
    await this.editions.save(edition);
    return edition;
  }
}
