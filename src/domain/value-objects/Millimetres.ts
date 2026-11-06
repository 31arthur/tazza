export type Millimetres = number & { readonly __brand: 'Millimetres' };

export const millimetres = (value: number): Millimetres => {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`Millimetres must be a finite, non-negative number, got ${value}`);
  }
  return value as Millimetres;
};

export const PAGE_SIZES = {
  A3: { width: millimetres(297), height: millimetres(420) },
  A4: { width: millimetres(210), height: millimetres(297) },
} as const;
