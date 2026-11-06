import { TazzaDb } from '@data/datasources/TazzaDb';
import { DexieArticleRepository } from '@data/repositories/DexieArticleRepository';
import { DexieAssetRepository } from '@data/repositories/DexieAssetRepository';
import { DexieEditionRepository } from '@data/repositories/DexieEditionRepository';
import { DexieLibraryRepository } from '@data/repositories/DexieLibraryRepository';
import { JsonBundleCodec } from '@data/services/JsonBundleCodec';
import { SystemClock } from '@data/services/SystemClock';
import { UuidGenerator } from '@data/services/UuidGenerator';
import { CreateArticle } from '@domain/usecases/article/CreateArticle';
import { DeleteArticle } from '@domain/usecases/article/DeleteArticle';
import { GetArticle } from '@domain/usecases/article/GetArticle';
import { ListArticles } from '@domain/usecases/article/ListArticles';
import { LoadSampleStories } from '@domain/usecases/article/LoadSampleStories';
import { UpdateArticle } from '@domain/usecases/article/UpdateArticle';
import { DeleteAsset } from '@domain/usecases/asset/DeleteAsset';
import { GetAssetBlob } from '@domain/usecases/asset/GetAssetBlob';
import { ExportEditionBundle } from '@domain/usecases/edition/ExportEditionBundle';
import { ImportEditionBundle } from '@domain/usecases/edition/ImportEditionBundle';
import { AddArticleNote } from '@domain/usecases/workflow/AddArticleNote';
import { ChangeArticleStatus } from '@domain/usecases/workflow/ChangeArticleStatus';
import { ResolveArticleNote } from '@domain/usecases/workflow/ResolveArticleNote';
import { RestoreArticleVersion } from '@domain/usecases/workflow/RestoreArticleVersion';
import { SaveArticleVersion } from '@domain/usecases/workflow/SaveArticleVersion';
import { RunPreflight } from '@domain/usecases/edition/RunPreflight';
import { ListAssets } from '@domain/usecases/asset/ListAssets';
import { UpdateAssetMeta } from '@domain/usecases/asset/UpdateAssetMeta';
import { SaveAsset } from '@domain/usecases/asset/SaveAsset';
import { GetOrCreateEdition } from '@domain/usecases/edition/GetOrCreateEdition';
import { RestoreEdition } from '@domain/usecases/edition/RestoreEdition';
import { ApplyEditionTemplate } from '@domain/usecases/library/ApplyEditionTemplate';
import { ApplyPageTemplate } from '@domain/usecases/library/ApplyPageTemplate';
import { DeleteLibraryItem } from '@domain/usecases/library/DeleteLibraryItem';
import { ListLibrary } from '@domain/usecases/library/ListLibrary';
import { SaveBrandKit } from '@domain/usecases/library/SaveBrandKit';
import { SaveEditionTemplate } from '@domain/usecases/library/SaveEditionTemplate';
import { SavePageTemplate } from '@domain/usecases/library/SavePageTemplate';
import { SaveTileStyle } from '@domain/usecases/library/SaveTileStyle';
import { AssignMaster } from '@domain/usecases/masters/AssignMaster';
import { CreateMaster } from '@domain/usecases/masters/CreateMaster';
import { DeleteMaster } from '@domain/usecases/masters/DeleteMaster';
import { RenameMaster } from '@domain/usecases/masters/RenameMaster';
import { UpdateMasthead } from '@domain/usecases/edition/UpdateMasthead';
import type { UseCases } from '@domain/usecases';
import { AddObject } from '@domain/usecases/objects/AddObject';
import { AlignObjects } from '@domain/usecases/objects/AlignObjects';
import { DistributeObjects } from '@domain/usecases/objects/DistributeObjects';
import { DuplicateObjects } from '@domain/usecases/objects/DuplicateObjects';
import { GroupObjects } from '@domain/usecases/objects/GroupObjects';
import { RemoveObjects } from '@domain/usecases/objects/RemoveObjects';
import { ReorderObjects } from '@domain/usecases/objects/ReorderObjects';
import { SetGuides } from '@domain/usecases/objects/SetGuides';
import { UngroupObjects } from '@domain/usecases/objects/UngroupObjects';
import { UpdateObjects } from '@domain/usecases/objects/UpdateObjects';
import { AddElement } from '@domain/usecases/layout/AddElement';
import { AddPage } from '@domain/usecases/layout/AddPage';
import { ApplyTemplate } from '@domain/usecases/layout/ApplyTemplate';
import { AutoFitPage } from '@domain/usecases/layout/AutoFitPage';
import { AutoLayout } from '@domain/usecases/layout/AutoLayout';
import { ClearLayout } from '@domain/usecases/layout/ClearLayout';
import { ClearSlot } from '@domain/usecases/layout/ClearSlot';
import { ContinueStory } from '@domain/usecases/layout/ContinueStory';
import { DropArticle } from '@domain/usecases/layout/DropArticle';
import { PlaceArticle } from '@domain/usecases/layout/PlaceArticle';
import { RemovePage } from '@domain/usecases/layout/RemovePage';
import { RemoveSlot } from '@domain/usecases/layout/RemoveSlot';
import { ResizeSplit } from '@domain/usecases/layout/ResizeSplit';
import { SetSlotRole } from '@domain/usecases/layout/SetSlotRole';
import { UnlinkContinuation } from '@domain/usecases/layout/UnlinkContinuation';
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
  const library = new DexieLibraryRepository(db);
  const clock = new SystemClock();
  const ids = new UuidGenerator();
  const bundleCodec = new JsonBundleCodec();

  const useCases: UseCases = {
    getOrCreateEdition: new GetOrCreateEdition(editions, ids, library),
    updateMasthead: new UpdateMasthead(editions),
    restoreEdition: new RestoreEdition(editions),
    createMaster: new CreateMaster(editions, ids),
    assignMaster: new AssignMaster(editions),
    renameMaster: new RenameMaster(editions),
    deleteMaster: new DeleteMaster(editions),
    listLibrary: new ListLibrary(library),
    savePageTemplate: new SavePageTemplate(editions, library, ids, clock),
    saveEditionTemplate: new SaveEditionTemplate(editions, library, ids, clock),
    saveTileStyle: new SaveTileStyle(library, ids, clock),
    saveBrandKit: new SaveBrandKit(library, clock),
    deleteLibraryItem: new DeleteLibraryItem(library),
    applyPageTemplate: new ApplyPageTemplate(articles, editions, library, ids),
    applyEditionTemplate: new ApplyEditionTemplate(articles, editions, library, ids),
    listArticles: new ListArticles(articles),
    createArticle: new CreateArticle(articles, ids, clock),
    getArticle: new GetArticle(articles),
    updateArticle: new UpdateArticle(articles, clock),
    deleteArticle: new DeleteArticle(articles, editions),
    loadSampleStories: new LoadSampleStories(articles, assets, ids, clock),
    saveAsset: new SaveAsset(assets, ids, clock),
    getAssetBlob: new GetAssetBlob(assets),
    listAssets: new ListAssets(assets, articles, editions),
    updateAssetMeta: new UpdateAssetMeta(assets),
    deleteAsset: new DeleteAsset(assets, articles, editions),
    runPreflight: new RunPreflight(editions, articles, assets),
    changeArticleStatus: new ChangeArticleStatus(articles, ids, clock),
    addArticleNote: new AddArticleNote(articles, ids, clock),
    resolveArticleNote: new ResolveArticleNote(articles),
    saveArticleVersion: new SaveArticleVersion(articles, ids, clock),
    restoreArticleVersion: new RestoreArticleVersion(articles, ids, clock),
    exportEditionBundle: new ExportEditionBundle(editions, articles, assets, bundleCodec),
    importEditionBundle: new ImportEditionBundle(editions, articles, assets, bundleCodec),
    addPage: new AddPage(editions, ids),
    removePage: new RemovePage(editions),
    applyTemplate: new ApplyTemplate(articles, editions, ids),
    dropArticle: new DropArticle(articles, editions, ids),
    continueStory: new ContinueStory(articles, editions, ids),
    unlinkContinuation: new UnlinkContinuation(articles, editions, ids),
    addElement: new AddElement(articles, editions, ids),
    addObject: new AddObject(editions, ids),
    updateObjects: new UpdateObjects(editions),
    removeObjects: new RemoveObjects(editions),
    duplicateObjects: new DuplicateObjects(editions, ids),
    reorderObjects: new ReorderObjects(editions),
    alignObjects: new AlignObjects(editions),
    distributeObjects: new DistributeObjects(editions),
    groupObjects: new GroupObjects(editions, ids),
    ungroupObjects: new UngroupObjects(editions),
    setGuides: new SetGuides(editions),
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
