import { withIntake } from '../../../game/plant/site-intake';
import { installedValveByCommandId } from '../../../game/plant/installed-valves';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createMimicBoard } from '../../components/industrial-control/views/mimic-board';
import type { MimicState } from '../../components/industrial-control/logic/mimic';
import { createBoosterSet } from '../../components/plant/views/booster-set';
import type { BoosterFeed } from '../../components/plant/views/booster-set';
import { createWaterMeterSet } from '../../components/plant/views/balance-plant';
import { serviceAvailable } from '../../../game/plant/services';
import { WET_HALL_PLANT, newWetHall } from '../../../game/plant/wet-hall';
import { newPlantServices } from '../../../game/plant/services';
import { roomWorld } from '../../save/world-store';
import {
  dirtyWaterMimicSpec,
  dirtyWaterMimicState,
  freshWaterMimicSpec,
  freshWaterMimicState,
} from '../logic/wet-hall-water-mimics';
import type { WetHallWaterReading } from '../logic/wet-hall-water-mimics';

/**
 * The wet hall's working machines, bound to the world's wet hall
 * (`src/game/plant/wet-hall.ts`): the booster set's controller, the
 * make-up meter's register and the wet hall's mimic all read it, and the
 * booster set's RESET, on its controller or on the mimic, resets it.
 */
function wetHallWorld(standalone = false) {
  const store =
    standalone || typeof window === 'undefined' ? null : roomWorld();
  const world = () => store?.world.value;
  return {
    reading(): WetHallWaterReading {
      const w = world();
      const open = (tag: string) => {
        const v = installedValveByCommandId(tag);
        return !w || !v ? true : w.installedValves[v.assetId] !== false;
      };
      return {
        wetHall: w?.wetHall ?? newWetHall(),
        mains: w ? withIntake(w.plant, w.intake).sources.water : true,
        valves: { suction: open('WH-T1-IV1'), discharge: open('WH-MU1-IV2') },
      };
    },
    powered() {
      return serviceAvailable(
        world()?.plant ?? newPlantServices(),
        'wet_hall',
        'power',
      );
    },
    reset() {
      store?.dispatch({ type: 'plant/booster-reset' });
    },
    /** Drive one of the booster set's motorised valves open or shut. */
    valve(tag: string, open: boolean) {
      const v = installedValveByCommandId(tag);
      if (v) store?.dispatch({ type: 'plant/valve', id: v.assetId, open });
    },
  };
}

/**
 * The booster set, its controller reading the world's wet hall: its duty
 * changeover (DUTY, RUN, STOP, BOOST) the world's (the owner, 2026-10-26:
 * brought in from dev42), each pump heard as it runs up and coasts.
 */
export function createWorldBoosterSet(kit: PanelKit) {
  const w = wetHallWorld();
  const store = typeof window === 'undefined' ? null : roomWorld();
  const feed: BoosterFeed = {
    read() {
      const s = w.reading().wetHall;
      return {
        powered: w.powered(),
        tripped: s.boosterTripped,
        running: s.boosterRunning,
        flow: s.flow,
        breakTank: s.breakTank / WET_HALL_PLANT.breakTank,
      };
    },
    reset: () => w.reset(),
    // Its suction: the break tank's head over it.
    suction: () => 0.25,
    changeover: {
      state: () => w.reading().wetHall.booster,
      act: (action) => store?.dispatch({ type: 'booster/changeover', action }),
    },
  };
  return createBoosterSet(kit, feed);
}

/** The make-up meter, its register counting the world's make-up. */
export function createWorldWaterMeter(kit: PanelKit) {
  const w = wetHallWorld();
  const meter = createWaterMeterSet(kit);
  return {
    object: meter.group,
    update() {
      meter.show(w.reading().wetHall.meter);
    },
    // Its register's reading, as it shows it (prompt 068).
    status: () => `Reads ${meter.reading()}`,
  };
}

/** WH-MP1 locally, with copies in the old control room and bridge. */
export function createFreshWaterMimic(
  kit: PanelKit,
  standalone = false,
  remote = false,
) {
  const w = wetHallWorld(standalone);
  const spec = remote
    ? {
        ...freshWaterMimicSpec,
        buttons: freshWaterMimicSpec.buttons?.filter(
          (button) => button.id !== 'booster-reset',
        ),
      }
    : freshWaterMimicSpec;
  const board = createMimicBoard(kit, spec, {
    press: (id) => {
      if (id === 'booster-reset' && !remote) w.reset();
      const [which, act] = id.split('-');
      if (
        (which === 'suction' || which === 'discharge') &&
        (act === 'open' || act === 'shut')
      )
        w.valve(
          which === 'suction' ? 'WH-T1-IV1' : 'WH-MU1-IV2',
          act === 'open',
        );
    },
  });
  let lastWetHall: WetHallWaterReading['wetHall'] | null = null;
  let lastMains = false;
  let visible = '';
  let state: MimicState | null = null;
  return {
    object: board.group,
    parts: board.parts,
    update() {
      const reading = w.reading();
      if (reading.wetHall !== lastWetHall || reading.mains !== lastMains) {
        lastWetHall = reading.wetHall;
        lastMains = reading.mains;
        const next = freshWaterMimicState(reading);
        const key = JSON.stringify(next);
        if (key !== visible) {
          visible = key;
          state = next;
        }
      }
      board.show(state!);
    },
  };
}

/** WH-MP2: four pool waste branches converge on the pit. */
export function createDirtyWaterMimic(kit: PanelKit, standalone = false) {
  const w = wetHallWorld(standalone);
  const board = createMimicBoard(kit, dirtyWaterMimicSpec);
  let lastWetHall: WetHallWaterReading['wetHall'] | null = null;
  let visible = '';
  let state: MimicState | null = null;
  return {
    object: board.group,
    parts: board.parts,
    update() {
      const reading = w.reading();
      if (reading.wetHall !== lastWetHall) {
        lastWetHall = reading.wetHall;
        const next = dirtyWaterMimicState(reading);
        const key = JSON.stringify(next);
        if (key !== visible) {
          visible = key;
          state = next;
        }
      }
      board.show(state!);
    },
  };
}

/** Kept for the existing development-room exhibit until its pair is placed. */
export const createWetHallMimic = createFreshWaterMimic;
