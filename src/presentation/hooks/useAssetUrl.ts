import { useEffect, useState } from 'react';
import { useUseCases } from './AppContext';

/** Assets are immutable, so object URLs are cached for the life of the page. */
const cache = new Map<string, Promise<string | undefined>>();

export function useAssetUrl(assetId: string): string | undefined {
  const { getAssetBlob } = useUseCases();
  const [url, setUrl] = useState<string | undefined>();

  useEffect(() => {
    let alive = true;
    let pending = cache.get(assetId);
    if (!pending) {
      pending = getAssetBlob
        .execute({ id: assetId })
        .then((blob) => (blob ? URL.createObjectURL(blob) : undefined));
      cache.set(assetId, pending);
    }
    void pending.then((u) => {
      if (alive) setUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [assetId, getAssetBlob]);

  return url;
}
