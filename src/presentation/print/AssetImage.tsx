import type { CSSProperties } from 'react';
import { isDefaultAdjust, resolveAdjust, type ImageAdjust } from '@domain/entities/ImageAdjust';
import { useAssetUrl } from '../hooks/useAssetUrl';

interface Props {
  assetId: string;
  alt?: string;
  style?: CSSProperties;
  /** Crop, focal point, rotation and tone, applied without changing the stored photo. */
  adjust?: Partial<ImageAdjust> | undefined;
  fit?: 'cover' | 'contain';
}

const filterOf = (a: ImageAdjust): string | undefined => {
  const parts = [
    a.greyscale && 'grayscale(1)',
    a.brightness !== 1 && `brightness(${a.brightness})`,
    a.contrast !== 1 && `contrast(${a.contrast})`,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : undefined;
};

/**
 * A stored photo, drawn the same way in the editor, preview and print. In a fixed frame (the
 * caller gives it a height) the picture fills the frame and the focal point stays in view as it
 * is cropped and zoomed.
 */
export function AssetImage({ assetId, alt = '', style, adjust, fit = 'cover' }: Props) {
  const url = useAssetUrl(assetId);
  if (!url) {
    return <div style={{ background: '#e5e5e5', aspectRatio: '3 / 2', ...style }} aria-hidden />;
  }

  const base: CSSProperties = { display: 'block', width: '100%', height: 'auto', ...style };
  if (isDefaultAdjust(adjust)) {
    return <img src={url} alt={alt} draggable={false} style={{ ...base, objectFit: fit }} />;
  }

  const a = resolveAdjust(adjust);
  const position = `${a.focalX * 100}% ${a.focalY * 100}%`;
  const filter = filterOf(a);
  const turned = a.rotation === 90 || a.rotation === 270;

  if (!turned) {
    return (
      <img
        src={url}
        alt={alt}
        draggable={false}
        style={{
          ...base,
          objectFit: fit,
          objectPosition: position,
          filter,
          ...(a.zoom !== 1 && { transform: `scale(${a.zoom})`, transformOrigin: position }),
          ...(a.rotation === 180 && { transform: `rotate(180deg) scale(${a.zoom})`, transformOrigin: 'center' }),
        }}
      />
    );
  }

  // A quarter turn swaps the picture's sides, so it is laid out sideways inside a sized box
  // (container units) and rotated to upright.
  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        containerType: 'size',
        width: '100%',
        height: base.height === 'auto' ? undefined : base.height,
        aspectRatio: base.height === 'auto' ? '2 / 3' : undefined,
      }}
    >
      <img
        src={url}
        alt={alt}
        draggable={false}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: '100cqh',
          height: '100cqw',
          maxWidth: 'none',
          objectFit: fit,
          objectPosition: position,
          filter,
          transform: `translate(-50%, -50%) rotate(${a.rotation}deg) scale(${a.zoom})`,
          transformOrigin: 'center',
        }}
      />
    </div>
  );
}
