import type { Article } from '../../entities/Article';
import { findPage, replacePage, type Edition } from '../../entities/Edition';
import { NotFoundError } from '../../errors/DomainError';
import { fitPage, type ArticleLookup } from '../../layout/fit';
import { normalize, type LayoutNode } from '../../layout/tree';
import type { ArticleRepository } from '../../ports/repositories/ArticleRepository';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';

export interface LayoutContext {
  edition: Edition;
  articles: Article[];
  lookup: ArticleLookup;
}

/** Loads an edition together with its articles, ready for fitting. */
export async function loadLayoutContext(
  articles: ArticleRepository,
  editions: EditionRepository,
  editionId: string,
): Promise<LayoutContext> {
  const edition = await editions.find(editionId);
  if (!edition) throw new NotFoundError(`Edition ${editionId} not found`);
  const list = await articles.listByEdition(editionId);
  const byId = new Map(list.map((a) => [a.id, a]));
  return { edition, articles: list, lookup: (id) => byId.get(id) };
}

export interface PageRef {
  editionId: string;
  pageNumber: number;
  /** When set, object commands act on this master's objects instead of the page's. */
  masterId?: string;
}

export interface LayoutDeps {
  articles: ArticleRepository;
  editions: EditionRepository;
}

/** Loads a page, applies a layout change, optionally re-fits the page, and saves. */
export async function changePageLayout(
  { articles, editions }: LayoutDeps,
  { editionId, pageNumber }: PageRef,
  change: (layout: LayoutNode) => LayoutNode,
  refit = true,
): Promise<Edition> {
  const ctx = await loadLayoutContext(articles, editions, editionId);
  const page = findPage(ctx.edition, pageNumber);
  const changed = normalize(change(page.layout));
  const layout = refit ? fitPage(changed, pageNumber, ctx.lookup) : changed;
  const updated = replacePage(ctx.edition, { number: pageNumber, layout });
  await editions.save(updated);
  return updated;
}
