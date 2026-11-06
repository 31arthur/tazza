import type { Asset } from '@domain/entities/Asset';

export interface AssetRecord extends Asset {
  schema: 1;
  blob: Blob;
}
