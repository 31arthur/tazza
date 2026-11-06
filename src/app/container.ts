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
import { LoadSampleStories } from '@domain/usecases/article/LoadSampleStories';
import { UpdateArticle } from '@domain/usecases/article/UpdateArticle';
import { GetAssetBlob } from '@domain/usecases/asset/GetAssetBlob';
import { SaveAsset } from '@domain/usecases/asset/SaveAsset';
import { GetOrCreateEdition } from '@domain/usecases/edition/GetOrCreateEdition';
import { RestoreEdition } from '@domain/usecases/edition/RestoreEdition';
import { UpdateMasthead } from '@domain/usecases/edition/UpdateMasthead';
import type { UseCases } from '@domain/usecases';
import { AddElement } from '@domain/usecases/layout/AddElement';
import { AddPage } from '@domain/usecases/layout/AddPage';
import { ApplyTemplate } from '@domain/usecases/layout/ApplyTemplate';
import { AutoFitPage } from '@domain/usecases/layout/AutoFitPage';
import { AutoLayout } from '@domain/usecases/layout/AutoLayout';
import { ClearLayout } from '@domain/usecases/layout/ClearLayout';
import { ClearSlot } from '@domain/usecases/layout/ClearSlot';
import { DropArticle } from '@domain/usecases/layout/DropArticle';
import { PlaceArticle } from '@domain/usecases/layout/PlaceArticle';
import { RemovePage } from '@domain/usecases/layout/RemovePage';
import { RemoveSlot } from '@domain/usecases/layout/RemoveSlot';
import { ResizeSplit } from '@domain/usecases/layout/ResizeSplit';
import { SetSlotRole } from '@domain/usecases/layout/SetSlotRole';
import { SetSlotStyle } from '@domain/usecases/layout/SetSlotStyle';
import { UpdateElement } from '@domain/usecases/layout/UpdateElement';

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
    getOrCreateEdition: new GetOrCreateEdition(editions, ids),
    updateMasthead: new UpdateMasthead(editions),
    restoreEdition: new RestoreEdition(editions),
    listArticles: new ListArticles(articles),
    createArticle: new CreateArticle(articles, ids, clock),
    getArticle: new GetArticle(articles),
    updateArticle: new UpdateArticle(articles, clock),
    deleteArticle: new DeleteArticle(articles, editions),
    loadSampleStories: new LoadSampleStories(articles, assets, ids, clock),
    saveAsset: new SaveAsset(assets, ids),
    getAssetBlob: new GetAssetBlob(assets),
    addPage: new AddPage(editions, ids),
    removePage: new RemovePage(editions),
    applyTemplate: new ApplyTemplate(articles, editions, ids),
    dropArticle: new DropArticle(articles, editions, ids),
    addElement: new AddElement(articles, editions, ids),
    updateElement: new UpdateElement(articles, editions),
    placeArticle: new PlaceArticle(articles, editions, ids),
    clearSlot: new ClearSlot(articles, editions),
    removeSlot: new RemoveSlot(articles, editions, ids),
    setSlotRole: new SetSlotRole(articles, editions),
    setSlotStyle: new SetSlotStyle(articles, editions),
    resizeSplit: new ResizeSplit(articles, editions),
    autoFitPage: new AutoFitPage(articles, editions),
    clearLayout: new ClearLayout(editions, ids),
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
