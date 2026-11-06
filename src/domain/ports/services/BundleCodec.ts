import type { EditionBundle } from '../../entities/EditionBundle';

/** Turns a bundle into a single file and back. Decoding throws BundleError for bad files. */
export interface BundleCodec {
  encode(bundle: EditionBundle): Promise<Blob>;
  decode(file: Blob): Promise<EditionBundle>;
}
