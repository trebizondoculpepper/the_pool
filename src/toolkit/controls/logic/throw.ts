/**
 * The general throw (mission 211; the owner, 2026-11-05): LET GO sends a
 * held thing off at one fixed, leisurely speed the way it is aimed, on a
 * parabola under gravity, until it comes down on the floor or a top. On
 * meeting a solid thing's side (a wall, a cabinet: the floor-plan
 * rectangles the walker cannot walk through) it rebounds, keeping three
 * quarters of its speed. Aimed down, the same rule makes a short drop.
 * Pure; metres, y up.
 */

/** The one throwing speed, metres per second: an easy underarm toss indoors. */
export const THROW_SPEED = 3;
/** How much speed a thrown thing keeps when it rebounds off a solid's side. */
export const THROW_REBOUND_KEEP = 0.75;
/** Gravity, metres per second squared. */
export const THROW_GRAVITY = 9.81;

export interface ThrowState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** How many times it has rebounded. */
  rebounds: number;
}

export interface Side {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** A thrown thing's start: from `at`, along `aim` (any length), at the throwing speed. */
export function launch(
  at: { x: number; y: number; z: number },
  aim: { x: number; y: number; z: number },
  speed = THROW_SPEED,
): ThrowState {
  const length = Math.hypot(aim.x, aim.y, aim.z) || 1;
  return {
    ...at,
    vx: (aim.x / length) * speed,
    vy: (aim.y / length) * speed,
    vz: (aim.z / length) * speed,
    rebounds: 0,
  };
}

/**
 * One step of a thrown thing's flight, `dt` seconds: gravity, and a
 * rebound off any solid it would enter (each grown by the thing's
 * half-size `half` on the floor plan), its side's way of travel turned
 * back and its speed cut to `THROW_REBOUND_KEEP`. Ground is the caller's.
 */
export function stepThrow(
  state: ThrowState,
  dt: number,
  solids: readonly Side[],
  half = 0,
  gravity = THROW_GRAVITY,
): ThrowState {
  let { vx, vz, rebounds } = state;
  const vy = state.vy - gravity * dt;
  let x = state.x + vx * dt;
  let z = state.z + vz * dt;
  for (const s of solids) {
    const minX = s.minX - half;
    const maxX = s.maxX + half;
    const minZ = s.minZ - half;
    const maxZ = s.maxZ + half;
    if (x <= minX || x >= maxX || z <= minZ || z >= maxZ) continue;
    const wasInX = state.x > minX && state.x < maxX;
    const wasInZ = state.z > minZ && state.z < maxZ;
    // Already inside (it started there): leave it be.
    if (wasInX && wasInZ) continue;
    // Crossing into it along x (it was beside it), else along z.
    if (!wasInX) {
      x = state.x;
      vx = -vx;
    } else {
      z = state.z;
      vz = -vz;
    }
    vx *= THROW_REBOUND_KEEP;
    vz *= THROW_REBOUND_KEEP;
    rebounds++;
  }
  return { x, y: state.y + vy * dt, z, vx, vy, vz, rebounds };
}
