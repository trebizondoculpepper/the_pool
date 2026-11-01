import { signal } from '@preact/signals-core';
import { partAudio } from '../../core/audio/part-audio';
import { beginPart } from '../../core/parts/parts';
import type { Part } from '../../core/parts/parts';
import type { PanelKit } from '../../core/views/eighties-controls';
import type { BoilerState } from '../logic/boiler-house';
import { SILENT, boilerSound, boilerSoundEvents } from '../logic/boiler-sounds';
import {
  BOILER_EVENTS,
  BOILER_LOOPS,
  burnerRoar,
} from '../audio/boiler-sounds';

/**
 * A boiler's sounds, heard from where it stands (the owner, 2026-11-01):
 * a part with no shape of its own, placed in the boiler's casing, holding
 * its pump, fan, igniter and burner as its controller's state calls for
 * them (`logic/boiler-sounds.ts`) and sounding the flame's lighting and
 * going out. Being a part, it falls silent with its room's other parts
 * when the room is out of hearing. `show` it the boiler's state each frame.
 */
export function createBoilerSounder(
  kit: PanelKit,
  name: string,
): Part & { show(state: BoilerState): void } {
  const a = beginPart(kit, `${name} sounds`);
  // Heard, not seen: nothing for the inspection overlay.
  a.object.userData.workingPart = false;
  const now = signal(SILENT);
  for (const key of ['pump', 'fan', 'spark'] as const) {
    const on = signal(false);
    a.holdWhile(on, BOILER_LOOPS[key]);
    a.updates.push(() => (on.value = now.value[key]));
  }
  for (const step of [1, 2, 3, 4] as const) {
    const on = signal(false);
    a.holdWhile(on, burnerRoar(step));
    a.updates.push(() => (on.value = now.value.burner === step));
  }
  let last: BoilerState | null = null;
  let audible = true;
  const part = a.part();
  return {
    ...part,
    setAudible(on) {
      audible = on;
      part.setAudible(on);
    },
    show(state: BoilerState) {
      const heard = boilerSound(state);
      const was = now.value;
      if (
        heard.pump !== was.pump ||
        heard.fan !== was.fan ||
        heard.spark !== was.spark ||
        heard.burner !== was.burner
      )
        now.value = heard;
      if (audible && last && last !== state)
        for (const event of boilerSoundEvents(last, state))
          partAudio.play(BOILER_EVENTS[event], a.object);
      last = state;
    },
  };
}
