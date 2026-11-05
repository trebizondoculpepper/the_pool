import { describe, expect, it } from 'vite-plus/test';
import { offerFullscreen } from './fullscreen-offer';

describe('offerFullscreen', () => {
  it('offers only when asked for, possible and not already fullscreen', () => {
    expect(offerFullscreen('?fullscreen=1', true, false)).toBe(true);
    expect(offerFullscreen('?graphics=low&fullscreen=1', true, false)).toBe(
      true,
    );
    expect(offerFullscreen('', true, false)).toBe(false);
    expect(offerFullscreen('?fullscreen=1', false, false)).toBe(false);
    expect(offerFullscreen('?fullscreen=1', true, true)).toBe(false);
  });
});
