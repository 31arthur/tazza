const MAX_WIDTH_PX = 2400;

export interface PreparedImage {
  blob: Blob;
  widthPx: number;
  heightPx: number;
}

/** Reads an image file and downsizes very large photos so storage and PDF stay manageable. */
export async function prepareImage(file: File): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width <= MAX_WIDTH_PX) {
      return { blob: file, widthPx: bitmap.width, heightPx: bitmap.height };
    }
    const scale = MAX_WIDTH_PX / bitmap.width;
    const width = MAX_WIDTH_PX;
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available');
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Could not encode image'))),
        'image/jpeg',
        0.9,
      ),
    );
    return { blob, widthPx: width, heightPx: height };
  } finally {
    bitmap.close();
  }
}

export const isImageFile = (file: File): boolean => file.type.startsWith('image/');
