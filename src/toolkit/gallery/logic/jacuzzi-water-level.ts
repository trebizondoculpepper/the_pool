/** Adapt the world's mean-depth water quantity to the stepped tub's capacity. */
export function jacuzziVisualVolume(
  level: number,
  meanDepth: number,
  capacity: number,
) {
  return capacity * Math.max(0, Math.min(1, 1 + level / meanDepth));
}

/** The hall and the tub builder share these dimensions, in metres. */
export const JACUZZI_TUB = {
  r: 1.2,
  rim: 0.9,
  seat: 0.57,
  below: 0.45,
  gutter: 0.2,
  deck: 1.6,
  steps: 3,
  going: 0.2,
} as const;

export const JACUZZI_FLOOR_Y = 0.005;
export const JACUZZI_FULL_SURFACE_Y = JACUZZI_TUB.rim - 0.015;

/** Local floor under a walker inside the raised Jacuzzi tub. */
export function jacuzziFloorAt(x: number, z: number): number | null {
  const r = Math.hypot(x, z);
  if (r >= JACUZZI_TUB.r) return null;
  return r > JACUZZI_TUB.r - JACUZZI_TUB.seat
    ? JACUZZI_FULL_SURFACE_Y - JACUZZI_TUB.below
    : JACUZZI_FLOOR_Y;
}
