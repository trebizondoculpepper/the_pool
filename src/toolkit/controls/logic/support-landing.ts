/**
 * Which support a falling thing lands on (mission 181; the owner's bug,
 * 2026-11-05: a box held low while looking down at the desk fell past its
 * top to the floor). Pure: metres, y up.
 */

export interface SupportTop {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  top: number;
}

/** Where a thing was let go: its middle on the floor plan, and its top. */
export interface Release {
  x: number;
  z: number;
  /** The height of its top when let go. */
  top: number;
}

const over = (s: SupportTop, x: number, z: number) =>
  x >= s.minX && x <= s.maxX && z >= s.minZ && z <= s.maxZ;

/**
 * The ground under a falling thing at (`x`, `z`): the highest support there
 * it may land on, or `floor`. A support counts when its top is no higher
 * than the thing's bottom now (`bottom`, so nothing jumps onto a desk from
 * beside it), or when the thing was let go over it with part of itself
 * above its top (`release`): held low over a desk, it is put on the desk,
 * not dropped through it. A thing let go wholly under a top (under the
 * desk, in its knee space) still falls to the floor.
 */
export function landingGround(
  supports: readonly SupportTop[],
  x: number,
  z: number,
  bottom: number,
  floor: number,
  release?: Release,
  tolerance = 0.035,
): number {
  let ground = floor;
  for (const s of supports) {
    if (!over(s, x, z)) continue;
    const below = s.top <= bottom + tolerance;
    const heldOver =
      release !== undefined &&
      over(s, release.x, release.z) &&
      s.top <= release.top + tolerance;
    if (below || heldOver) ground = Math.max(ground, s.top);
  }
  return ground;
}
