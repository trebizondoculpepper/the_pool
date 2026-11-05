import { describe, expect, it } from 'vite-plus/test';
import { boxBetween, modelExtent, primitiveTop } from './bounds-model';

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
});
