import { describe, expect, it } from 'vite-plus/test';
import { inSideDoorway } from './dock-sky';

// The loading bay: 14.3 m wide, 12 m deep, 0.2 m walls.
const dock = { wallZ: -6.2, width: 14.3 };

describe('the loading dock sky', () => {
  it('is drawn for an eye in the dock', () => {
    expect(inSideDoorway({ x: 0, z: 0 }, dock)).toBe(false);
  });
  it('is drawn for an eye in the main corridor, beyond the back doors', () => {
    expect(inSideDoorway({ x: 0, z: 6.17 }, dock)).toBe(false);
    expect(inSideDoorway({ x: 0.5, z: 7.3 }, dock)).toBe(false);
  });
  it('is cut away in a chemical store side doorway or beyond', () => {
    expect(inSideDoorway({ x: 7.2, z: 1.7 }, dock)).toBe(true);
    expect(inSideDoorway({ x: -9, z: 1.7 }, dock)).toBe(true);
  });
  it('is drawn out in the yard', () => {
    expect(inSideDoorway({ x: 9, z: -10 }, dock)).toBe(false);
  });
});
