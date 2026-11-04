import type { Footprint } from '../../controls/logic/walk-collision';

/**
 * Derived surfaces (missions 175, 181, 182; the owner, 2026-11-04): a
 * supportable or walkable object's top is found from its geometry, not
 * hand-placed. Rays are cast straight down on a grid over its body (in
 * `views/derived-surfaces.ts`); this module turns those samples into a
 * plane: the dominant upward-facing height (the mode, to a few
 * millimetres), anything within a step above it counted as part of it
 * (flanges, a hatch), and the footprint the plane covers. It also answers
 * the walker's questions (is it standing on a surface; where are the edges
 * it must not walk off) the same way for every surface: no rule names a
 * kind or an object. Pure.
 */

/** One downward ray: where it was cast, and the height of the first upward face it met (null: missed). */
export interface SurfaceSample {
  x: number;
  z: number;
  y: number | null;
}

export interface DerivedSurface {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** The plane's height. */
  top: number;
  /** The share of the samples over the footprint that hit the plane (0–1). */
  coverage: number;
  /** `weak` where no plane dominates or too little of the footprint is covered: a cue for an exception. */
  confidence: 'good' | 'weak';
  /** Whether the walker may stand on it (walkable), or only objects (supportable). */
  walkable: boolean;
}

export interface DeriveOptions {
  /** Heights within this of one another are one plane, scene units. */
  tolerance: number;
  /** Anything this far above the plane still counts as part of it (a flange, a hatch). */
  step: number;
  walkable: boolean;
}

/**
 * The plane a set of samples describes, or null where nothing was hit. The
 * mode of the hit heights (bucketed by `tolerance`); the footprint is the
 * extent of the hits at the plane (within `step` above it).
 */
export function deriveSurface(
  samples: readonly SurfaceSample[],
  options: DeriveOptions,
): DerivedSurface | null {
  const hits = samples.filter(
    (s): s is SurfaceSample & { y: number } => s.y !== null,
  );
  if (!hits.length) return null;
  const buckets = new Map<number, number[]>();
  for (const h of hits) {
    const key = Math.round(h.y / options.tolerance);
    buckets.set(key, [...(buckets.get(key) ?? []), h.y]);
  }
  let best: number[] = [];
  for (const ys of buckets.values()) if (ys.length > best.length) best = ys;
  const top = best.reduce((a, b) => a + b, 0) / best.length;
  const on = hits.filter(
    (h) => h.y >= top - options.tolerance && h.y <= top + options.step,
  );
  const minX = Math.min(...on.map((h) => h.x));
  const maxX = Math.max(...on.map((h) => h.x));
  const minZ = Math.min(...on.map((h) => h.z));
  const maxZ = Math.max(...on.map((h) => h.z));
  const within = samples.filter(
    (s) => s.x >= minX && s.x <= maxX && s.z >= minZ && s.z <= maxZ,
  );
  const coverage = within.length ? on.length / within.length : 0;
  const dominance = best.length / hits.length;
  return {
    minX,
    maxX,
    minZ,
    maxZ,
    top,
    coverage,
    confidence: coverage >= 0.6 && dominance >= 0.4 ? 'good' : 'weak',
    walkable: options.walkable,
  };
}

/** A surface at a fixed height over a footprint (`surface=plane`). */
export const planeSurface = (
  footprint: Footprint,
  top: number,
  walkable: boolean,
): DerivedSurface => ({
  ...footprint,
  top,
  coverage: 1,
  confidence: 'good',
  walkable,
});

/**
 * The height the walker stands at on a walkable surface at (x, z), if it is
 * over one and already up at it (at most `stepUp` below its top, so it
 * steps across from a ladder's landing but never up from the floor);
 * the highest such surface where several overlap.
 */
export function surfaceAt(
  surfaces: readonly DerivedSurface[],
  x: number,
  z: number,
  previous: number,
  stepUp: number,
): number | null {
  let found: number | null = null;
  for (const s of surfaces) {
    if (!s.walkable) continue;
    if (x < s.minX || x > s.maxX || z < s.minZ || z > s.maxZ) continue;
    if (previous < s.top - stepUp) continue;
    if (found === null || s.top > found) found = s.top;
  }
  return found;
}

/** The walkable surface the walker stands on at height `y` (within `tolerance`), if any. */
export const surfaceUnder = (
  surfaces: readonly DerivedSurface[],
  x: number,
  z: number,
  y: number,
  tolerance: number,
): DerivedSurface | undefined =>
  surfaces.find(
    (s) =>
      s.walkable &&
      Math.abs(s.top - y) <= tolerance &&
      x >= s.minX &&
      x <= s.maxX &&
      z >= s.minZ &&
      z <= s.maxZ,
  );

/**
 * The edges of a surface the walker must not walk off (the owner's rule: no
 * drop of more than 1 m), as thin solids just outside it, where the drop
 * to `below` is more than `maxDrop`. A ladder is reached from inside the
 * edge (its top exit is on the surface), so edges never cut it off.
 */
export function edgeSolids(
  s: DerivedSurface,
  below: number,
  maxDrop: number,
  thickness: number,
): Footprint[] {
  if (s.top - below <= maxDrop) return [];
  const t = thickness;
  return [
    { minX: s.minX - t, maxX: s.maxX + t, minZ: s.minZ - t, maxZ: s.minZ },
    { minX: s.minX - t, maxX: s.maxX + t, minZ: s.maxZ, maxZ: s.maxZ + t },
    { minX: s.minX - t, maxX: s.minX, minZ: s.minZ, maxZ: s.maxZ },
    { minX: s.maxX, maxX: s.maxX + t, minZ: s.minZ, maxZ: s.maxZ },
  ];
}

/** Supportable surfaces as supports for things that fall (a footprint with a top). */
export const surfaceSupports = (surfaces: readonly DerivedSurface[]) =>
  surfaces.map(({ minX, maxX, minZ, maxZ, top }) => ({
    minX,
    maxX,
    minZ,
    maxZ,
    top,
  }));
