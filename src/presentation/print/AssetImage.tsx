import type { CSSProperties } from 'react';
import { useAssetUrl } from '../hooks/useAssetUrl';

export function AssetImage({
  assetId,
  alt = '',
  style,
}: {
  assetId: string;
  alt?: string;
  style?: CSSProperties;
}) {
  const url = useAssetUrl(assetId);
  if (!url) {
    return <div style={{ background: '#e5e5e5', aspectRatio: '3 / 2', ...style }} aria-hidden />;
  }
  return (
    <img
      src={url}
      alt={alt}
      draggable={false}
      style={{ display: 'block', width: '100%', height: 'auto', ...style }}
    />
  );
}
