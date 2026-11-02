/** Nominal pitch and manufacturing spread of Warden's annunciator bleeper. */
export const ANNUNCIATOR_BLEEP_HZ = 2400;
export const ANNUNCIATOR_BLEEP_SD_HZ = 10;

/** A fixed tuning for one physical sounder, derived from its installation key. */
export function annunciatorBleeper(key: string) {
  let seed = 2166136261;
  for (const character of key) {
    seed ^= character.charCodeAt(0);
    seed = Math.imul(seed, 16777619);
  }
  seed ||= 1;
  const uniform = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return ((seed >>> 0) + 0.5) / 0x1_0000_0000;
  };
  const radius = Math.sqrt(-2 * Math.log(uniform()));
  const angle = 2 * Math.PI * uniform();
  // Box-Muller gives two independent standard-normal draws. The second
  // gives each free-running pulse clock a tiny, stable mechanical drift.
  return {
    hz:
      ANNUNCIATOR_BLEEP_HZ + ANNUNCIATOR_BLEEP_SD_HZ * radius * Math.cos(angle),
    pulseHz: 2 + 0.015 * radius * Math.sin(angle),
    startDelay: uniform() / 2,
  };
}
