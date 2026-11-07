import { describe, expect, it } from 'vite-plus/test';
import { fourBitChannel, quantiseRgb444 } from './phone-colour';
import { phoneGlyph } from './phone-font';

describe('phone colour matrix', () => {
  it('limits every RGB channel to 16 levels without changing transparency', () => {
    const pixels = new Uint8ClampedArray([10, 127, 250, 65, 255, 0, 42, 255]);
    quantiseRgb444(pixels);
    expect([...pixels]).toEqual([17, 119, 255, 65, 255, 0, 34, 255]);
    expect(
      new Set(Array.from({ length: 256 }, (_, n) => fourBitChannel(n))).size,
    ).toBe(16);
  });

  it('provides the original fixed-size handset glyphs and a fallback', () => {
    expect(phoneGlyph('A')).toHaveLength(7);
    expect(phoneGlyph('a')).toEqual(phoneGlyph('A'));
    expect(phoneGlyph('●')).not.toEqual(phoneGlyph(' '));
    expect(phoneGlyph('£')).toEqual(phoneGlyph('?'));
    expect(phoneGlyph('A').every((row) => row >= 0 && row < 32)).toBe(true);
  });
});
