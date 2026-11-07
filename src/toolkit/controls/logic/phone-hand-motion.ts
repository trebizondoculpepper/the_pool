export interface PhoneHandMotion {
  x: number;
  y: number;
  z: number;
  pitch: number;
  yaw: number;
  roll: number;
}

const STILL: PhoneHandMotion = {
  x: 0,
  y: 0,
  z: 0,
  pitch: 0,
  yaw: 0,
  roll: 0,
};

const degrees = (angle: number) => (angle * Math.PI) / 180;

/** Smooth the physical walking response without tying it to frame rate. */
export function phoneWalkActivity(
  previous: number,
  walkRate: number,
  delta: number,
) {
  const target = Math.max(0, Math.min(1, walkRate));
  return (
    previous + (target - previous) * (1 - Math.exp(-Math.max(0, delta) * 8))
  );
}

/** Small, repeatable camera-space pose; activity is a smoothed 0..1 walk rate. */
export function phoneHandMotion(
  seconds: number,
  activity: number,
  reducedMotion = false,
): PhoneHandMotion {
  if (reducedMotion) return STILL;
  const walk = Math.max(0, Math.min(1, activity));
  const slow = Math.max(0, seconds);
  return {
    x: 0.003 * Math.sin(slow * 0.72) + walk * 0.004 * Math.sin(slow * 7),
    y: 0.002 * Math.sin(slow * 0.91 + 0.8) + walk * 0.005 * Math.sin(slow * 14),
    z:
      0.002 * Math.sin(slow * 0.54 + 1.6) +
      walk * 0.003 * Math.sin(slow * 7 + 0.9),
    pitch: degrees(
      0.17 * Math.sin(slow * 0.63) + walk * 0.18 * Math.sin(slow * 7 + 0.5),
    ),
    yaw: degrees(
      0.19 * Math.sin(slow * 0.75 + 1.2) + walk * 0.16 * Math.sin(slow * 7),
    ),
    roll: degrees(
      0.25 * Math.sin(slow * 0.58 + 0.4) +
        walk * 0.22 * Math.sin(slow * 7 + 1.8),
    ),
  };
}
