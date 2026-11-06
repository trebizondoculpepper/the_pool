import { describe, expect, it } from 'vite-plus/test';
import {
  blocksWalker,
  boxBetween,
  modelExtent,
  modelFits,
  primitiveFootprint,
  primitiveTop,
} from './bounds-model';

describe('bounds models', () => {
  it('gives a box its whole top face', () => {
    const top = primitiveTop(
      boxBetween({ x: -0.8, y: 0.7, z: -0.4 }, { x: 0.8, y: 0.73, z: 0.4 }),
    );
    expect(top.minX).toBeCloseTo(-0.8);
    expect(top.maxX).toBeCloseTo(0.8);
    expect(top.minZ).toBeCloseTo(-0.4);
    expect(top.maxZ).toBeCloseTo(0.4);
    expect(top.y).toBeCloseTo(0.73);
  });

  it('gives an upright cylinder the square inscribed in its circle', () => {
    const top = primitiveTop({
      type: 'cylinder',
      centre: { x: 0, y: 1, z: 0 },
      radius: 1,
      length: 2,
      axis: 'y',
    });
    expect(top.maxX - top.minX).toBeCloseTo(Math.SQRT2);
    expect(top.y).toBeCloseTo(2);
  });

  it('gives a lying cylinder a narrow crown along its length', () => {
    const top = primitiveTop({
      type: 'cylinder',
      centre: { x: 0, y: 0.5, z: 0 },
      radius: 0.5,
      length: 3,
      axis: 'x',
    });
    expect(top.maxX - top.minX).toBeCloseTo(3);
    expect(top.maxZ - top.minZ).toBeCloseTo(0.25);
    expect(top.y).toBeCloseTo(1);
  });

  it('measures a model’s extent, and has none when empty', () => {
    expect(modelExtent([])).toBeNull();
    const e = modelExtent([
      boxBetween({ x: -1, y: 0, z: -1 }, { x: 1, y: 1, z: 1 }),
      {
        type: 'cylinder',
        centre: { x: 2, y: 0.5, z: 0 },
        radius: 0.5,
        length: 1,
        axis: 'y',
      },
    ])!;
    expect(e.min).toEqual({ x: -1, y: 0, z: -1 });
    expect(e.max).toEqual({ x: 2.5, y: 1, z: 1 });
  });

  it('marks a solid shape on the floor plan, turned and moved as its object is', () => {
    const board = boxBetween(
      { x: -0.8, y: 0.7, z: -0.4 },
      { x: 0.8, y: 0.73, z: 0.4 },
    );
    // Moved 2 m along x and 3 m along z, no turn: the board's own footprint.
    const moved = primitiveFootprint(board, (v) => ({
      x: v.x + 2,
      y: v.y,
      z: v.z + 3,
    }));
    expect(moved.minX).toBeCloseTo(1.2);
    expect(moved.maxX).toBeCloseTo(2.8);
    expect(moved.minZ).toBeCloseTo(2.6);
    expect(moved.maxZ).toBeCloseTo(3.4);
    expect(moved.bottom).toBeCloseTo(0.7);
    expect(moved.top).toBeCloseTo(0.73);
    // A quarter turn about y swaps its length onto z.
    const turned = primitiveFootprint(board, (v) => ({
      x: v.z,
      y: v.y,
      z: -v.x,
    }));
    expect(turned.maxX - turned.minX).toBeCloseTo(0.8);
    expect(turned.maxZ - turned.minZ).toBeCloseTo(1.6);
  });

  it('blocks the walker only where a shape reaches between the floor and head height', () => {
    const at = (bottom: number, top: number) => ({
      minX: 0,
      maxX: 1,
      minZ: 0,
      maxZ: 1,
      bottom,
      top,
    });
    expect(blocksWalker(at(0, 0.73), 0, 2)).toBe(true); // a desk
    expect(blocksWalker(at(2.4, 2.8), 0, 2)).toBe(false); // a duct overhead
    expect(blocksWalker(at(-1, 0), 0, 2)).toBe(false); // wholly under the floor
    expect(blocksWalker(at(1.5, 3), 0, 2)).toBe(true); // hangs to chest height
  });

  it('checks that a declared model fits its drawn object and reaches its top', () => {
    const drawn = {
      min: { x: -0.8, y: 0, z: -0.4 },
      max: { x: 0.8, y: 0.73, z: 0.4 },
    };
    const board = [
      boxBetween({ x: -0.8, y: 0.7, z: -0.4 }, { x: 0.8, y: 0.73, z: 0.4 }),
    ];
    expect(modelFits(board, drawn)).toBe(true);
    // Overhanging the drawn desk by 10 cm: it no longer fits.
    expect(
      modelFits(
        [boxBetween({ x: -0.9, y: 0.7, z: -0.4 }, { x: 0.8, y: 0.73, z: 0.4 })],
        drawn,
      ),
    ).toBe(false);
    // Under the drawn top: things would sink into the desk.
    expect(
      modelFits(
        [boxBetween({ x: -0.8, y: 0.6, z: -0.4 }, { x: 0.8, y: 0.65, z: 0.4 })],
        drawn,
      ),
    ).toBe(false);
    expect(modelFits([], drawn)).toBe(false);
  });
});
