import { describe, expect, it } from 'vite-plus/test';
import {
  LED_HOT_SPOT_FROM,
  LED_LENS_STOPS,
  ledLensPixels,
  ledLensShade,
} from './led-lens';

describe('LED lens gradient', () => {
  it('is brightest at the centre, a hot spot', () => {
    expect(ledLensShade(0)).toBe(1);
    expect(ledLensShade(0.05)).toBeGreaterThan(LED_HOT_SPOT_FROM);
    expect(ledLensShade(0.4)).toBeLessThan(LED_HOT_SPOT_FROM);
  });

  it('falls from the centre to the bezel ring', () => {
    let last = ledLensShade(0);
    for (let r = 0.02; r <= 0.91; r += 0.02) {
      const v = ledLensShade(r);
      expect(v).toBeLessThanOrEqual(last + 1e-9);
      last = v;
    }
  });

  it('has a faint darker ring where the lens meets its bezel', () => {
    const ring = ledLensShade(0.91);
    expect(ring).toBeLessThan(ledLensShade(0.84));
    expect(ring).toBeLessThan(ledLensShade(1));
    expect(ring).toBeGreaterThan(0);
  });

  it('passes through its stops and holds the rim beyond', () => {
    for (const [r, v] of LED_LENS_STOPS) expect(ledLensShade(r)).toBeCloseTo(v);
    expect(ledLensShade(1.4)).toBe(ledLensShade(1));
    expect(ledLensShade(-1)).toBe(1);
  });

  it('draws a grey square, opaque, brightest in the middle', () => {
    const size = 16;
    const data = ledLensPixels(size);
    expect(data.length).toBe(size * size * 4);
    const at = (x: number, y: number) => (y * size + x) * 4;
    const mid = at(size / 2, size / 2);
    expect(data[mid]).toBeGreaterThan(data[at(1, size / 2)]);
    for (let i = 0; i < data.length; i += 4) {
      expect(data[i]).toBe(data[i + 1]);
      expect(data[i]).toBe(data[i + 2]);
      expect(data[i + 3]).toBe(255);
    }
  });
});
