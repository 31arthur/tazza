/**
 * Non-destructive treatment of a photo where it is used: which part of the picture stays
 * visible when it is cropped to its frame, how far it is zoomed in, rotation, and tone.
 * The original is never changed, and two uses of one photo can be cropped differently.
 */
export interface ImageAdjust {
  /** The point of interest, 0 to 1 across and down the picture: crops keep it in view. */
  readonly focalX: number;
  readonly focalY: number;
  /** 1 fits the frame; larger zooms in towards the focal point. */
  readonly zoom: number;
  /** Quarter turns, clockwise. */
  readonly rotation: 0 | 90 | 180 | 270;
  readonly greyscale: boolean;
  /** 1 leaves the tone unchanged. */
  readonly brightness: number;
  readonly contrast: number;
}

export const DEFAULT_ADJUST: ImageAdjust = {
  focalX: 0.5,
  focalY: 0.5,
  zoom: 1,
  rotation: 0,
  greyscale: false,
  brightness: 1,
  contrast: 1,
};

const clamp = (n: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));

const QUARTERS = [0, 90, 180, 270] as const;

/** A complete, valid adjustment from a saved (sparse) one. */
export const resolveAdjust = (saved: Partial<ImageAdjust> | undefined): ImageAdjust => {
  const merged = { ...DEFAULT_ADJUST, ...saved };
  const turns = ((Math.round(merged.rotation / 90) % 4) + 4) % 4;
  return {
    focalX: clamp(merged.focalX, 0, 1),
    focalY: clamp(merged.focalY, 0, 1),
    zoom: clamp(merged.zoom, 1, 5),
    rotation: QUARTERS[turns] ?? 0,
    greyscale: merged.greyscale,
    brightness: clamp(merged.brightness, 0.4, 1.8),
    contrast: clamp(merged.contrast, 0.4, 1.8),
  };
};

export const isDefaultAdjust = (saved: Partial<ImageAdjust> | undefined): boolean => {
  const a = resolveAdjust(saved);
  return (Object.keys(DEFAULT_ADJUST) as (keyof ImageAdjust)[]).every(
    (key) => a[key] === DEFAULT_ADJUST[key],
  );
};

/** A turn of 90 or 270 degrees swaps the picture's width and height. */
const swapped = (a: ImageAdjust) => a.rotation === 90 || a.rotation === 270;

/**
 * Pixels per inch the printed picture really has: the visible part of the original spread over
 * the frame (the picture fills the frame, then is zoomed). Below about 200 a photo prints soft.
 */
export const effectivePpi = (
  image: { widthPx: number; heightPx: number },
  frameMm: { w: number; h: number },
  saved: Partial<ImageAdjust> | undefined,
): number => {
  const a = resolveAdjust(saved);
  const imageW = swapped(a) ? image.heightPx : image.widthPx;
  const imageH = swapped(a) ? image.widthPx : image.heightPx;
  if (imageW <= 0 || imageH <= 0 || frameMm.w <= 0 || frameMm.h <= 0) return 0;
  // Cover: the smaller scale that still fills the frame, in mm per source pixel.
  const mmPerPx = Math.max(frameMm.w / imageW, frameMm.h / imageH) * a.zoom;
  return 25.4 / mmPerPx;
};

/** Photos below this effective resolution are flagged for print. */
export const MIN_PRINT_PPI = 200;
