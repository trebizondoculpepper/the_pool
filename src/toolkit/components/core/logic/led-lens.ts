/**
 * The shading across an indicator lens's face (the owner, 2026-11-01): a
 * lit lamp is brightest at its centre, a hot spot, falls to its saturated
 * colour over most of the face, darkens towards the rim, and shows a faint
 * darker ring where the lens meets its bezel. One greyscale gradient, drawn
 * once and shared by every LED, tinted by the lamp's colour.
 */

/** The gradient's stops: radius (0 centre, 1 rim) and brightness (0–1). */
export const LED_LENS_STOPS: readonly (readonly [number, number])[] = [
  [0, 1],
  [0.18, 0.86],
  [0.62, 0.62],
  [0.84, 0.42],
  [0.91, 0.2],
  [0.96, 0.3],
  [1, 0.26],
];

/** Above this brightness the lit lens whitens towards its hot spot. */
export const LED_HOT_SPOT_FROM = 0.86;

/** The lens's brightness at `radius` (0 centre, 1 rim; beyond is the rim). */
export function ledLensShade(radius: number): number {
  const r = Math.min(1, Math.max(0, radius));
  for (let i = 1; i < LED_LENS_STOPS.length; i++) {
    const [r1, v1] = LED_LENS_STOPS[i];
    if (r > r1) continue;
    const [r0, v0] = LED_LENS_STOPS[i - 1];
    const t = (r - r0) / (r1 - r0);
    // Smoothly between stops, so no ring shows where two meet.
    const s = t * t * (3 - 2 * t);
    return v0 + (v1 - v0) * s;
  }
  return LED_LENS_STOPS[LED_LENS_STOPS.length - 1][1];
}

/**
 * The gradient as `size` × `size` RGBA bytes, grey, the lens's centre at
 * the middle of the square (a cylinder cap's UVs map its rim to the
 * square's inscribed circle).
 */
export function ledLensPixels(size = 64): Uint8Array {
  const data = new Uint8Array(size * size * 4);
  const half = size / 2;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const radius = Math.hypot(x + 0.5 - half, y + 0.5 - half) / half;
      const v = Math.round(ledLensShade(radius) * 255);
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = v;
      data[i + 3] = 255;
    }
  return data;
}
