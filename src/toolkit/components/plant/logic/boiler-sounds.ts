import type { BoilerState } from './boiler-house';
import { IGNITION_SECONDS } from './boiler-house';

/**
 * What a boiler sounds like, from its controller's state alone (the owner,
 * 2026-11-01; `doc/research/boiler-house-control.md`, "Sounds"): its pump
 * runs from the moment it is called until its run-on ends; its fan through
 * the purge, the ignition and the firing; its igniter ticks through the
 * ignition; its burner roars while it fires, louder at a higher firing
 * rate; and the flame lighting is a soft whumpf. Keyed only on
 * `BoilerState` (agreed with mission 121's owner, which keeps that shape):
 * code 0 standby, 1 purging, 2 igniting, 3 firing, 7 pump run-on, 9
 * blocked. Pure: the room's view holds the sounds these name.
 */

/** The held sounds a boiler makes now; `burner` its roar's step, 0 for none. */
export interface BoilerSound {
  pump: boolean;
  fan: boolean;
  spark: boolean;
  /** The burner's roar, in steps of its firing rate: 0 silent, 1 to 4. */
  burner: 0 | 1 | 2 | 3 | 4;
}

export const SILENT: BoilerSound = {
  pump: false,
  fan: false,
  spark: false,
  burner: 0,
};

/** The burner's roar's steps, so it changes only as its firing rate does by a quarter. */
export const BURNER_STEPS = 4;

export function boilerSound(b: BoilerState): BoilerSound {
  if (!b.on || b.lockout) return SILENT;
  const pump = b.code === 1 || b.code === 2 || b.code === 3 || b.code === 7;
  const fan = b.code === 1 || b.code === 2 || b.code === 3;
  // The igniter ticks until the flame is proved, within its ignition time.
  const spark = b.code === 2 && b.timer < IGNITION_SECONDS;
  const burner =
    b.code === 3
      ? (Math.max(
          1,
          Math.min(BURNER_STEPS, Math.ceil(b.rate * BURNER_STEPS)),
        ) as BoilerSound['burner'])
      : 0;
  return { pump, fan, spark, burner };
}

/** A moment worth a sound of its own: the flame lighting, or going out. */
export type BoilerSoundEvent = 'ignite' | 'flame-out';

/** What happened between two of a boiler's states, to be heard once. */
export function boilerSoundEvents(
  before: BoilerState,
  after: BoilerState,
): BoilerSoundEvent[] {
  const lit = (b: BoilerState) => b.on && !b.lockout && b.code === 3;
  if (!lit(before) && lit(after)) return ['ignite'];
  if (lit(before) && !lit(after)) return ['flame-out'];
  return [];
}
