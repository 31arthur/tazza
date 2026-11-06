import { TazzaDb } from '@data/datasources/TazzaDb';
import { DexieArticleRepository } from '@data/repositories/DexieArticleRepository';
import { DexieAssetRepository } from '@data/repositories/DexieAssetRepository';
import { DexieEditionRepository } from '@data/repositories/DexieEditionRepository';
import { SystemClock } from '@data/services/SystemClock';
import { UuidGenerator } from '@data/services/UuidGenerator';
import { CreateArticle } from '@domain/usecases/article/CreateArticle';
import { DeleteArticle } from '@domain/usecases/article/DeleteArticle';
import { GetArticle } from '@domain/usecases/article/GetArticle';
import { ListArticles } from '@domain/usecases/article/ListArticles';
import { UpdateArticle } from '@domain/usecases/article/UpdateArticle';
import { GetAssetBlob } from '@domain/usecases/asset/GetAssetBlob';
import { SaveAsset } from '@domain/usecases/asset/SaveAsset';
import { GetOrCreateEdition } from '@domain/usecases/edition/GetOrCreateEdition';
import type { UseCases } from '@domain/usecases';
import { AddPage } from '@domain/usecases/layout/AddPage';
import { AutoLayout } from '@domain/usecases/layout/AutoLayout';
import { ClearLayout } from '@domain/usecases/layout/ClearLayout';
import { PlaceArticle } from '@domain/usecases/layout/PlaceArticle';
import { RemoveBlock } from '@domain/usecases/layout/RemoveBlock';
import { RemovePage } from '@domain/usecases/layout/RemovePage';
import { UpdateBlock } from '@domain/usecases/layout/UpdateBlock';

export interface Container {
  useCases: UseCases;
  /** Today's date as YYYY-MM-DD in the local time zone. */
  today(): string;
}

/** Composition root: the only place adapters are constructed and injected. */
export const createContainer = (): Container => {
  const db = new TazzaDb();
  const articles = new DexieArticleRepository(db);
  const editions = new DexieEditionRepository(db);
  const assets = new DexieAssetRepository(db);
  const clock = new SystemClock();
  const ids = new UuidGenerator();

  const useCases: UseCases = {
    getOrCreateEdition: new GetOrCreateEdition(editions),
    listArticles: new ListArticles(articles),
    createArticle: new CreateArticle(articles, ids, clock),
    getArticle: new GetArticle(articles),
    updateArticle: new UpdateArticle(articles, clock),
    deleteArticle: new DeleteArticle(articles, editions),
    saveAsset: new SaveAsset(assets, ids),
    getAssetBlob: new GetAssetBlob(assets),
    addPage: new AddPage(editions),
    removePage: new RemovePage(editions),
    placeArticle: new PlaceArticle(articles, editions, ids),
    updateBlock: new UpdateBlock(editions),
    removeBlock: new RemoveBlock(editions),
    clearLayout: new ClearLayout(editions),
    autoLayout: new AutoLayout(articles, editions, ids),
  };

  return {
    useCases,
    today: () => {
      const d = new Date(clock.now());
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    },
  };
};
