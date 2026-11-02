/**
 * A Holstein's coat, as the Gateway 3000's cartons and badges wear it
 * (`brands.ts`, the `carton` mark): where its black blotches fall. Pure;
 * drawn by `core/views/cow-carton.ts`. Moved here from the period PC's
 * logic so the brand's mark, which every category may use, can draw it.
 */

/** One blotch of a Holstein's coat, as fractions of the surface it is on. */
export interface CowSpot {
  x: number;
  y: number;
  /** Its radius, a fraction of the surface's shorter side. */
  r: number;
  /** Its outline's wobble: the radius at each of its lobes' angles, as multiples of `r`. */
  lobes: number[];
}

/** A small seeded generator: the same numbers for the same seed. */
export function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0;
    s = (s ^ (s >>> 13)) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Black blotches for a white surface: `count` of them, scattered evenly
 * enough that no stretch is bare and none crowds another, each an
 * irregular lobed blob, as on a Holstein (and a Gateway carton).
 */
export function cowSpots(seed: number, count: number): CowSpot[] {
  const rand = seeded(seed);
  const cols = Math.max(1, Math.round(Math.sqrt(count)));
  const rows = Math.ceil(count / cols);
  return Array.from({ length: count }, (_, i) => {
    const x = ((i % cols) + 0.15 + rand() * 0.7) / cols;
    const y = (Math.floor(i / cols) + 0.15 + rand() * 0.7) / rows;
    const lobes = Array.from({ length: 11 }, () => 0.5 + rand() * 0.85);
    return { x, y, r: (0.3 + rand() * 0.22) / cols, lobes };
  });
}
