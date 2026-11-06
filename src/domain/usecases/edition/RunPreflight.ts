import { NotFoundError } from '../../errors/DomainError';
import type { ArticleRepository } from '../../ports/repositories/ArticleRepository';
import type { AssetRepository } from '../../ports/repositories/AssetRepository';
import type { EditionRepository } from '../../ports/repositories/EditionRepository';
import { runPreflight, type PreflightIssue } from '../../services/preflight';

export interface RunPreflightInput {
  readonly editionId: string;
  /** Bleed the pages will be printed with, in millimetres (0 for none). */
  readonly bleedMm?: number;
}

/** Checks an edition for problems that would show up in print. Read-only. */
export class RunPreflight {
  constructor(
    private readonly editions: EditionRepository,
    private readonly articles: ArticleRepository,
    private readonly assets: AssetRepository,
  ) {}

  async execute({ editionId, bleedMm = 0 }: RunPreflightInput): Promise<PreflightIssue[]> {
    const edition = await this.editions.find(editionId);
    if (!edition) throw new NotFoundError(`Edition ${editionId} not found`);
    const [articles, assets] = await Promise.all([
      this.articles.listByEdition(editionId),
      this.assets.list(),
    ]);
    return runPreflight({ edition, articles, assets, bleedMm });
  }
}
