import type { Asset } from '@domain/entities/Asset';
import {
  BUNDLE_FORMAT,
  BUNDLE_VERSION,
  type EditionBundle,
} from '@domain/entities/EditionBundle';
import { BundleError } from '@domain/errors/DomainError';
import type { BundleCodec } from '@domain/ports/services/BundleCodec';

interface StoredAsset {
  readonly asset: Asset;
  readonly mimeType: string;
  /** The picture, base64 encoded. */
  readonly data: string;
}

const CHUNK = 0x8000;

const toBase64 = async (blob: Blob): Promise<string> => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
};

const fromBase64 = (data: string, type: string): Blob => {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** One readable JSON file: the edition and stories as data, the pictures as base64. */
export class JsonBundleCodec implements BundleCodec {
  async encode(bundle: EditionBundle): Promise<Blob> {
    const assets: StoredAsset[] = await Promise.all(
      bundle.assets.map(async ({ asset, blob }) => ({
        asset,
        mimeType: blob.type || asset.mimeType,
        data: await toBase64(blob),
      })),
    );
    const json = JSON.stringify({
      format: BUNDLE_FORMAT,
      version: BUNDLE_VERSION,
      edition: bundle.edition,
      articles: bundle.articles,
      assets,
    });
    return new Blob([json], { type: 'application/json' });
  }

  async decode(file: Blob): Promise<EditionBundle> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      throw new BundleError('This file is not a Tazza edition file.');
    }
    if (!isObject(parsed) || parsed['format'] !== BUNDLE_FORMAT) {
      throw new BundleError('This file is not a Tazza edition file.');
    }
    if (typeof parsed['version'] !== 'number' || parsed['version'] > BUNDLE_VERSION) {
      throw new BundleError('This file was made by a newer version of Tazza.');
    }
    const { edition, articles, assets } = parsed;
    if (
      !isObject(edition) ||
      typeof edition['id'] !== 'string' ||
      !Array.isArray(edition['pages']) ||
      !Array.isArray(articles) ||
      !Array.isArray(assets)
    ) {
      throw new BundleError('The edition file is damaged.');
    }
    return {
      format: BUNDLE_FORMAT,
      version: BUNDLE_VERSION,
      edition: edition as unknown as EditionBundle['edition'],
      articles: articles as EditionBundle['articles'],
      assets: (assets as StoredAsset[]).map((a) => ({
        asset: a.asset,
        blob: fromBase64(a.data, a.mimeType),
      })),
    };
  }
}
