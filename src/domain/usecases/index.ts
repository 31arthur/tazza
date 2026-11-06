import type { GetAssetBlob } from './asset/GetAssetBlob';
import type { SaveAsset } from './asset/SaveAsset';
import type { CreateArticle } from './article/CreateArticle';
import type { DeleteArticle } from './article/DeleteArticle';
import type { GetArticle } from './article/GetArticle';
import type { ListArticles } from './article/ListArticles';
import type { UpdateArticle } from './article/UpdateArticle';
import type { GetOrCreateEdition } from './edition/GetOrCreateEdition';
import type { AddPage } from './layout/AddPage';
import type { AutoLayout } from './layout/AutoLayout';
import type { ClearLayout } from './layout/ClearLayout';
import type { PlaceArticle } from './layout/PlaceArticle';
import type { RemoveBlock } from './layout/RemoveBlock';
import type { RemovePage } from './layout/RemovePage';
import type { UpdateBlock } from './layout/UpdateBlock';

/** Everything the presentation layer may call. Built in the composition root. */
export interface UseCases {
  getOrCreateEdition: GetOrCreateEdition;
  listArticles: ListArticles;
  createArticle: CreateArticle;
  getArticle: GetArticle;
  updateArticle: UpdateArticle;
  deleteArticle: DeleteArticle;
  saveAsset: SaveAsset;
  getAssetBlob: GetAssetBlob;
  addPage: AddPage;
  removePage: RemovePage;
  placeArticle: PlaceArticle;
  updateBlock: UpdateBlock;
  removeBlock: RemoveBlock;
  clearLayout: ClearLayout;
  autoLayout: AutoLayout;
}
