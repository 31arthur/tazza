import { millimetres, PAGE_SIZES } from './Millimetres';

describe('Millimetres', () => {
  it('accepts non-negative finite numbers', () => {
    expect(millimetres(0)).toBe(0);
  });

  it('rejects negative and non-finite numbers', () => {
    expect(() => millimetres(-1)).toThrow(RangeError);
    expect(() => millimetres(Number.NaN)).toThrow(RangeError);
  });

  it('defines A3 as 297 x 420', () => {
    expect(PAGE_SIZES.A3).toEqual({ width: 297, height: 420 });
  });
});
