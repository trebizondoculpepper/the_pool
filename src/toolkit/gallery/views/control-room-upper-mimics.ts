import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createMimicBoard } from '../../components/industrial-control/views/mimic-board';
import {
  gasPressures,
  meterFlow,
} from '../../components/plant/logic/boiler-house';
import type { LiveExhibit } from '../rooms/plant/exhibit';
import { boilerHouseShown } from '../rooms/plant/boiler';
import { roomWorld } from '../../save/world-store';
import { JACUZZI_MIMIC, jacuzziMimicState } from '../logic/jacuzzi-mimic';
import { GAS_MIMIC, gasState } from '../logic/pool-mimics';
import { BOILER_HEAT_MIMIC, boilerHeatState } from '../logic/boiler-heat-mimic';
import { createLoungeFilterMimic } from './lounge-filter-mimic';

/** Whether two lists hold the same things: the boiler house sets a boiler in its list in place. */
const same = (a: readonly unknown[], b: readonly unknown[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

/**
 * The control room's upper row of mimics (the owner, 2026-11-01): copies
 * of the plant rooms' boards, read only, each showing what its plant
 * room's board shows. The lounge's and the jacuzzi's from the world; the
 * boiler house's from the world's gas safety and the boilers as the
 * boiler house last stepped them (its controllers are its room's).
 * Each works out its state only when what it reads has changed.
 */
export function createUpperMimic(
  kit: PanelKit,
  kind: string,
): LiveExhibit | null {
  const store = typeof window === 'undefined' ? null : roomWorld();
  if (kind === 'mimic-lounge-filter') {
    const mimic = createLoungeFilterMimic(kit, store, true);
    return { object: mimic.group, parts: mimic.parts, update: mimic.update };
  }
  if (kind === 'mimic-jacuzzi') {
    const board = createMimicBoard(kit, JACUZZI_MIMIC, { maker: 'penfold' });
    let shown: unknown = null;
    return {
      object: board.group,
      parts: board.parts,
      update(delta) {
        board.parts.update(delta);
        if (!store || store.world.value === shown) return;
        shown = store.world.value;
        board.show(jacuzziMimicState(store.world.value));
      },
    };
  }
  if (kind === 'mimic-gas') {
    const board = createMimicBoard(kit, GAS_MIMIC);
    let shown: unknown[] = [];
    return {
      object: board.group,
      parts: board.parts,
      update() {
        const house = boilerHouseShown();
        const safety = store?.world.value.boilerGas;
        const inputs = [safety, house.gas, ...house.boilers];
        if (same(inputs, shown)) return;
        shown = inputs;
        // The gas safety the world's, the isolators the boiler house's.
        const gas = safety
          ? {
              ...house.gas,
              ecvOpen: safety.ecvOpen,
              stopPressed: safety.stopPressed,
              gasDetected: safety.gasDetected,
              ssovOpen: safety.ssovOpen,
            }
          : house.gas;
        const flow = meterFlow(gas, [...house.boilers]);
        const { supply, burners } = gasPressures(gas, flow);
        board.show(
          gasState({
            ecvOpen: gas.ecvOpen,
            ssovOpen: gas.ssovOpen,
            stopPressed: gas.stopPressed,
            gasDetected: gas.gasDetected,
            isolators: gas.isolators,
            boilers: house.boilers.map((b) => ({
              firing: b.code === 3,
              lockout: b.lockout !== null,
              rate: b.rate,
            })),
            flow,
            supply,
            burners,
          }),
        );
      },
    };
  }
  if (kind === 'mimic-boiler-heat') {
    const board = createMimicBoard(kit, BOILER_HEAT_MIMIC);
    let shown: readonly unknown[] = [];
    return {
      object: board.group,
      parts: board.parts,
      update() {
        const { boilers } = boilerHouseShown();
        if (same(boilers, shown)) return;
        shown = [...boilers];
        board.show(boilerHeatState([...boilers]));
      },
    };
  }
  return null;
}
