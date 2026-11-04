/**
 * How light goes through a pool's water, as the tile shader models it
 * (`pool-surfaces.ts`). Pure.
 *
 * - **Absorption (Beer–Lambert).** Light crossing a path of L metres of
 *   water keeps exp(−σL) of itself, σ being the water's absorption
 *   coefficient per metre at each colour. Pure water absorbs red fastest
 *   and blue least (Pope and Fry, 1997: about 0.34 m⁻¹ at 650 nm, 0.06 at
 *   550 nm, 0.01 at 450 nm), which is why a pool goes from clear to
 *   turquoise to deep blue-green with depth. Pool water, with a little
 *   dissolved matter and fine scattering, absorbs somewhat more; the
 *   coefficients here are rounded up a little for that.
 * - **The path.** Seen from above, light reaching a tile on the floor has
 *   come down through the depth (the rooflights are nearly overhead) and
 *   back up to the eye along the refracted line of sight: the steeper the
 *   view, the shorter the second leg.
 * - **Scatter.** What the water takes out of the tile's colour it gives
 *   back, faintly, as its own blue-green glow: the light scattered toward
 *   the eye along the way.
 * - **Caustics focus with depth.** A ripple on the surface is a weak lens:
 *   just under the surface its light has not yet converged and its pattern
 *   is faint and broad; it is sharpest and brightest at about its focal
 *   depth; deeper still, the lines spread and blur again, and the light
 *   has further to go down and back, so they fade.
 */

/** The water's absorption coefficients, per metre: red, green, blue. */
export const ABSORPTION = [0.5, 0.1, 0.04] as const;

/** The scattered glow the water adds as it absorbs: red, green, blue. */
export const SCATTER = [0.02, 0.2, 0.26] as const;

/** Water's refractive index. */
export const WATER_IOR = 1.333;

/** The fraction of light kept over `metres` of water, per colour. */
export const transmittance = (metres: number): [number, number, number] =>
  ABSORPTION.map((sigma) => Math.exp(-sigma * Math.max(0, metres))) as [
    number,
    number,
    number,
  ];

/**
 * The line of sight's length under the water to a point `depth` metres
 * down, for a view whose direction's vertical component is `viewY` (from
 * −1, straight down, to 0, level), bent at the surface by refraction.
 */
export function viewPath(depth: number, viewY: number) {
  const down = Math.min(1, Math.abs(viewY));
  const sinAir = Math.sqrt(1 - down * down);
  const sinWater = sinAir / WATER_IOR;
  const cosWater = Math.sqrt(1 - sinWater * sinWater);
  return Math.max(0, depth) / cosWater;
}

/** Light's whole path to the eye from a tile `depth` down: down, then up. */
export const lightPath = (depth: number, viewY: number) =>
  Math.max(0, depth) + viewPath(depth, viewY);

/** The depth at which the ripples' caustics are brightest, metres. */
export const CAUSTIC_FOCUS = 0.8;

/**
 * How strong the caustics are at a depth, from focusing alone: 0 at the
 * surface, rising to 1 at the focal depth, easing away beyond it as the
 * lines blur ((d/F)·e^(1−d/F)). Absorption over the path dims them too.
 */
export function causticFocus(depth: number, focus = CAUSTIC_FOCUS) {
  const d = Math.max(0, depth) / focus;
  return d * Math.exp(1 - d);
}

/** How soft the caustic lines are at a depth: wider as they leave focus. */
export const causticSoftness = (depth: number, focus = CAUSTIC_FOCUS) =>
  0.12 + 0.1 * Math.abs(Math.max(0, depth) - focus);

/** The tile's colour seen through the water, per colour (0 to 1). */
export function throughWater(
  tile: readonly number[],
  depth: number,
  viewY: number,
) {
  return waterFog(tile, lightPath(depth, viewY));
}

/**
 * A colour seen through `path` metres of water: what the water keeps of it,
 * plus its own faint blue-green glow for what it absorbed (mission 203; the
 * same formula as `throughWater`, for an arbitrary water path).
 */
export function waterFog(
  colour: readonly number[],
  path: number,
): [number, number, number] {
  const kept = transmittance(path);
  return colour.map((c, i) => c * kept[i] + SCATTER[i] * (1 - kept[i])) as [
    number,
    number,
    number,
  ];
}

/** A point in 3D, as metres (x, y, z). */
export type WaterPoint = readonly [number, number, number];

const lengthOf = (a: WaterPoint, b: WaterPoint) =>
  Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);

/**
 * The length of the line of sight from `a` to `b` that lies below the water
 * plane at `waterY` (water occupies y < `waterY`): the whole ray for two
 * underwater points, none for two strictly above, the submerged part where
 * the sight crosses the surface — from under the water's surface or through
 * a porthole (mission 203).
 */
export function waterPathLength(
  a: WaterPoint,
  b: WaterPoint,
  waterY: number,
): number {
  const elsewhere = (p: WaterPoint) => p[1] >= waterY;
  if (elsewhere(a) && elsewhere(b)) return 0;
  if (!elsewhere(a) && !elsewhere(b)) return lengthOf(a, b);
  // It crosses the surface; the crossing point splits the ray.
  const t = (waterY - a[1]) / (b[1] - a[1]);
  const at: WaterPoint = [
    a[0] + (b[0] - a[0]) * t,
    waterY,
    a[2] + (b[2] - a[2]) * t,
  ];
  return elsewhere(a) ? lengthOf(at, b) : lengthOf(at, a);
}

/** Snell's window, the full angle of the air side a swimmer sees above, degrees. */
export const snellsWindow = () =>
  2 * Math.atan2(1, Math.sqrt(WATER_IOR * WATER_IOR - 1)) * (180 / Math.PI);
