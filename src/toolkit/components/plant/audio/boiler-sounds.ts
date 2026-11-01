import { click } from '../../core/audio/part-audio';
import type { LoopRecipe, SoundRecipe } from '../../core/audio/part-audio';
import { noiseSource } from '../../core/audio/part-loops';
import type { BoilerSound, BoilerSoundEvent } from '../logic/boiler-sounds';

/**
 * A boiler's sounds (the owner, 2026-11-01), synthesised, for the held
 * sounds and moments `logic/boiler-sounds.ts` names from its controller:
 *
 * - `BOILER_PUMP`: its shunt pump's motor, a steady 50 Hz hum and its
 *   harmonics with a little water noise, from its call to its run-on's end;
 * - `BOILER_FAN`: the combustion fan's airy whirr through the purge, the
 *   ignition and the firing;
 * - `IGNITER`: the spark igniter's tick, about six a second, until the
 *   flame is proved;
 * - `burnerRoar(step)`: the burner's low roar, one of four, louder and a
 *   little brighter at a higher firing rate;
 * - `IGNITE` and `FLAME_OUT`: the flame catching, a soft whumpf; and going
 *   out, a short falling hush.
 *
 * Quiet against a circulation pump, as the dosing pumps are; voice
 * limiting (prompt 098) decides what is heard in a room full of them.
 */

export const BOILER_PUMP: LoopRecipe = (context, out) => {
  const master = context.createGain();
  master.gain.value = 0.02;
  master.connect(out);
  const hum = (
    [
      [50, 0.5],
      [100, 0.3],
      [150, 0.1],
      [300, 0.04],
    ] as const
  ).map(([hz, level]) => {
    const osc = context.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = hz;
    const g = context.createGain();
    g.gain.value = level;
    osc.connect(g).connect(master);
    osc.start();
    return osc;
  });
  // Water through its volute: a little low, steady noise.
  const water = noiseSource(context);
  const low = context.createBiquadFilter();
  low.type = 'lowpass';
  low.frequency.value = 400;
  const wg = context.createGain();
  wg.gain.value = 0.15;
  water.connect(low).connect(wg).connect(master);
  water.start();
  return [...hum, water];
};

export const BOILER_FAN: LoopRecipe = (context, out) => {
  const air = noiseSource(context);
  const band = context.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 900;
  band.Q.value = 0.6;
  const g = context.createGain();
  g.gain.value = 0.018;
  air.connect(band).connect(g).connect(out);
  air.start();
  // Its blade pass: a faint whine.
  const whine = context.createOscillator();
  whine.type = 'triangle';
  whine.frequency.value = 410;
  const wg = context.createGain();
  wg.gain.value = 0.003;
  whine.connect(wg).connect(out);
  whine.start();
  return [air, whine];
};

export const IGNITER: LoopRecipe = (context, out) => {
  // A sharp, bright tick, gated six times a second.
  const crack = noiseSource(context);
  const high = context.createBiquadFilter();
  high.type = 'highpass';
  high.frequency.value = 3000;
  const gate = context.createGain();
  gate.gain.value = 0;
  const pulse = context.createOscillator();
  pulse.type = 'square';
  pulse.frequency.value = 6;
  // Square waves of ±1 opened only on their top half, briefly: a tick.
  const shaper = context.createWaveShaper();
  shaper.curve = new Float32Array([0, 0, 0, 0, 0.05]);
  const depth = context.createGain();
  depth.gain.value = 0.05;
  pulse.connect(shaper).connect(depth).connect(gate.gain);
  crack.connect(high).connect(gate).connect(out);
  crack.start();
  pulse.start();
  return [crack, pulse];
};

/** The burner's roar at one of its four steps of firing rate. */
export function burnerRoar(step: 1 | 2 | 3 | 4): LoopRecipe {
  return (context, out) => {
    const roar = noiseSource(context);
    const body = context.createBiquadFilter();
    body.type = 'lowpass';
    body.frequency.value = 160 + 60 * step;
    body.Q.value = 0.8;
    const g = context.createGain();
    g.gain.value = 0.012 + 0.008 * step;
    roar.connect(body).connect(g).connect(out);
    roar.start();
    // The flame's slow flutter.
    const flutter = context.createOscillator();
    flutter.frequency.value = 3.5;
    const fg = context.createGain();
    fg.gain.value = 0.004;
    flutter.connect(fg).connect(g.gain);
    flutter.start();
    return [roar, flutter];
  };
}

export const IGNITE: SoundRecipe = click({
  band: 220,
  q: 0.7,
  decay: 0.35,
  level: 0.12,
  thump: [55, 0.4],
});

export const FLAME_OUT: SoundRecipe = click({
  band: 500,
  q: 0.5,
  decay: 0.5,
  level: 0.04,
  sweep: 0.5,
});

/** Each held sound's recipe by name, for whoever holds them (`BoilerSound`). */
export const BOILER_LOOPS = {
  pump: BOILER_PUMP,
  fan: BOILER_FAN,
  spark: IGNITER,
} as const satisfies Record<Exclude<keyof BoilerSound, 'burner'>, LoopRecipe>;

/** Each moment's sound. */
export const BOILER_EVENTS: Record<BoilerSoundEvent, SoundRecipe> = {
  ignite: IGNITE,
  'flame-out': FLAME_OUT,
};
