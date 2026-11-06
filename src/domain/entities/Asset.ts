/**
 * A photo in the library. The picture itself is stored once; every place it is used (a story, a
 * photo box, an image frame) points at it and may crop and adjust it without touching the
 * original. Descriptive fields are optional because older photos were saved without them.
 */
export interface Asset {
  readonly id: string;
  readonly mimeType: string;
  readonly widthPx: number;
  readonly heightPx: number;
  readonly byteSize: number;
  /** Usually the file name. */
  readonly name?: string;
  /** Photographer or agency, printed with the caption. */
  readonly credit?: string;
  /** Default caption offered when the photo is used. */
  readonly caption?: string;
  readonly tags?: readonly string[];
  readonly createdAt?: number;
}

/** The fields an editor can change after a photo is saved. */
export type AssetMeta = Partial<Pick<Asset, 'name' | 'credit' | 'caption' | 'tags'>>;
