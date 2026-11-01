import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createMimicBoard } from '../../components/industrial-control/views/mimic-board';
import type { MimicState } from '../../components/industrial-control/logic/mimic';
import type { WorldStore } from '../../save/world-store';
import { roomWorld } from '../../save/world-store';
import { newLthwRing } from '../../../game/plant/lthw-ring';
import type { LthwRingState } from '../../../game/plant/lthw-ring';
import { ENERGY_MIMIC, energyMimicState } from '../logic/energy-mimic';

/**
 * The energy mimic (mission 120): each facility's heat from the LTHW ring,
 * read from the world's ring. Like the kW transducers behind its
 * digits, it samples every `SAMPLE_SECONDS` of the world's time, not
 * every step; its state is handed to the board only when a rounded value
 * differs from what it shows (mission 094). Read-only: it has no buttons
 * but its mode and LAMP TEST.
 */
export const SAMPLE_SECONDS = 2;

export function createEnergyMimic(kit: PanelKit, store?: WorldStore) {
  const world = store ?? (typeof window === 'undefined' ? null : roomWorld());
  const ring = (): LthwRingState => world?.world.value.lthw ?? fallback;
  const fallback = newLthwRing();
  const board = createMimicBoard(kit, ENERGY_MIMIC);
  let last: LthwRingState | null = null;
  let sampled = -Infinity;
  let visible = '';
  let state: MimicState = energyMimicState(fallback);
  return {
    object: board.group,
    parts: board.parts,
    update(delta: number) {
      board.parts.update(delta);
      const r = ring();
      const t = world?.world.value.time ?? 0;
      if (r !== last && (t - sampled >= SAMPLE_SECONDS || t < sampled)) {
        last = r;
        sampled = t;
        const next = energyMimicState(r);
        const key = JSON.stringify(next);
        if (key !== visible) {
          visible = key;
          state = next;
        }
      }
      board.show(state);
    },
  };
}
