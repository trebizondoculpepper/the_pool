/**
 * Bounds models (mission 208; the owner, 2026-11-05): beside an object's
 * high- and low-poly versions, a third, simpler one made of a few boxes and
 * cylinders in the object's own frame (metres). It is never drawn in play;
 * where the object's kind has the `bounds-model` trait, its tops come from
 * these shapes rather than from rays cast on its drawn body. An object
 * whose kind has the trait but which declares no model gets one box fitted
 * to its body. Pure: no Three.js.
 */

export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export type BoundsAxis = 'x' | 'y' | 'z';

/** One shape of a bounds model: a box, or a cylinder along an axis. */
export type BoundsPrimitive =
  | {
      readonly type: 'box';
      /** Its middle, in the object's frame, metres. */
      readonly centre: Vec3;
      /** Width (x), height (y) and depth (z), metres. */
      readonly size: {
        readonly w: number;
        readonly h: number;
        readonly d: number;
      };
    }
  | {
      readonly type: 'cylinder';
      readonly centre: Vec3;
      readonly radius: number;
      /** Its length along its axis, metres. */
      readonly length: number;
      readonly axis: BoundsAxis;
    };

export type BoundsModel = readonly BoundsPrimitive[];

/** A box from its extent in the object's frame. */
export const boxBetween = (min: Vec3, max: Vec3): BoundsPrimitive => ({
  type: 'box',
  centre: {
    x: (min.x + max.x) / 2,
    y: (min.y + max.y) / 2,
    z: (min.z + max.z) / 2,
  },
  size: { w: max.x - min.x, h: max.y - min.y, d: max.z - min.z },
});

/** A shape's flat top, in the object's frame: its footprint and height. */
export interface PrimitiveTop {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
  readonly y: number;
}

/**
 * The flat top a thing can rest on. A box's is its whole top face. An
 * upright cylinder's is the square inscribed in its circle (an axis-aligned
 * footprint can hold no more without overhanging). A lying cylinder has a
 * crown only: a strip half its radius wide along its length.
 */
export function primitiveTop(p: BoundsPrimitive): PrimitiveTop {
  const { x, y, z } = p.centre;
  if (p.type === 'box')
    return {
      minX: x - p.size.w / 2,
      maxX: x + p.size.w / 2,
      minZ: z - p.size.d / 2,
      maxZ: z + p.size.d / 2,
      y: y + p.size.h / 2,
    };
  if (p.axis === 'y') {
    const half = p.radius / Math.SQRT2;
    return {
      minX: x - half,
      maxX: x + half,
      minZ: z - half,
      maxZ: z + half,
      y: y + p.length / 2,
    };
  }
  const along = p.length / 2;
  const across = p.radius / 4;
  return p.axis === 'x'
    ? {
        minX: x - along,
        maxX: x + along,
        minZ: z - across,
        maxZ: z + across,
        y: y + p.radius,
      }
    : {
        minX: x - across,
        maxX: x + across,
        minZ: z - along,
        maxZ: z + along,
        y: y + p.radius,
      };
}

/** A model's extent in the object's frame, or null when it is empty. */
export function modelExtent(
  model: BoundsModel,
): { min: Vec3; max: Vec3 } | null {
  if (!model.length) return null;
  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const p of model) {
    const half =
      p.type === 'box'
        ? { x: p.size.w / 2, y: p.size.h / 2, z: p.size.d / 2 }
        : {
            x: p.axis === 'x' ? p.length / 2 : p.radius,
            y: p.axis === 'y' ? p.length / 2 : p.radius,
            z: p.axis === 'z' ? p.length / 2 : p.radius,
          };
    for (const k of ['x', 'y', 'z'] as const) {
      min[k] = Math.min(min[k], p.centre[k] - half[k]);
      max[k] = Math.max(max[k], p.centre[k] + half[k]);
    }
  }
  return { min, max };
}
