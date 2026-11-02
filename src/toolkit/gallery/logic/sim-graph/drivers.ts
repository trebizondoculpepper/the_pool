import { EVENT_SOURCES } from '../../../../game/events/event-sources';
import type { GameEvent } from '../../../../game/events/game-event';
import { alarmEvents } from '../../../../game/events/alarm-events';
import { valveEvents } from '../../../../game/events/valve-events';
import { watcherEvents } from '../../../../game/events/watchers';
import { pumpEvents } from '../../../../game/events/pump-events';
import { applyAction, stepWorld } from '../../../../game/world';
import type { World, WorldAction } from '../../../../game/world';
import type { NodeId, Provenance } from './graph';

/**
 * Section 4.4, what makes a node change (mission 138): per node, its
 * drivers, declared and each probed (`drivers.test.ts` changes the driver,
 * steps and asserts the state moves), whether instant (an action) or over
 * time (a step), the faults and trips its state models (On/Off unless
 * faults are modelled), and the event lines it produces: a sample made by
 * running its event source over a world before and after. Declared so far
 * for the example nodes. Pure.
 */

export interface Driver {
  what: string;
  how: 'instant' | 'over time';
  via: Provenance;
}

export interface ChangeSpec {
  drivers: readonly Driver[];
  faults: readonly string[];
  /** Which event source notices it, and the world change that makes a sample line. */
  events?: {
    source: 'watcherEvents' | 'valveEvents' | 'pumpEvents' | 'alarmEvents';
    actions: readonly WorldAction[];
    seconds: number;
    note?: string;
  };
}

const SOURCES = {
  watcherEvents,
  valveEvents,
  pumpEvents,
  alarmEvents,
} as const;

const probe = (entry: string): Provenance => ({
  table: 'CHANGES',
  entry,
  probe: 'drivers.test.ts',
});

export const CHANGES: Readonly<Record<NodeId, ChangeSpec>> = {
  'plant_pool_03/fitting:jacuzzi.drain': {
    drivers: [
      {
        what: "'pool/drain-down' (pool_03): jacuzziDrainDown writes installedValves['jacuzzi.drain'] and pools.pool_03.drainDown together",
        how: 'instant',
        via: probe('jacuzzi.drain'),
      },
    ],
    faults: [],
    events: {
      source: 'valveEvents',
      actions: [{ type: 'pool/drain-down', pool: 'pool_03', open: true }],
      seconds: 0,
    },
  },
  'plant_pool_03/part:cabinet/pump': {
    drivers: [
      {
        what: "its supply: the room's feeder, the switchboard and the cabinet isolator (jacuzziCabinetInputs.supplied)",
        how: 'instant',
        via: probe('cabinet/pump supply'),
      },
      {
        what: "the cabinet's POWER switch ('jacuzzi/cabinet' power), acting on its parent",
        how: 'instant',
        via: probe('cabinet/pump POWER'),
      },
      {
        what: 'its no-flow timer (stepJacuzziCabinet): with no way through it trips after NO_FLOW_TRIP s',
        how: 'over time',
        via: probe('cabinet/pump no-flow'),
      },
    ],
    faults: [
      "trip 'no-flow' (latched until RESET)",
      'tank low-low (TRIP: TANK LOW, clears itself)',
    ],
    events: {
      source: 'watcherEvents',
      actions: [{ type: 'plant/valve', id: 'jacuzzi.suction', open: false }],
      seconds: 10,
      note: 'its trip is logged by watcherEvents (watchers.ts), not pumpEvents, which watches the motor starters',
    },
  },
  'switch_room/node:incoming': {
    drivers: [
      {
        what: "'plant/source' power on or off",
        how: 'instant',
        via: probe('incoming'),
      },
    ],
    faults: [],
    events: {
      source: 'alarmEvents',
      actions: [{ type: 'plant/source', utility: 'power', on: false }],
      seconds: 1,
      note: 'its own change is logged through the MAINS FAIL window it raises',
    },
  },
  'control_room/alarm:mains-fail': {
    drivers: [
      {
        what: 'senseAlarms in stepWorld, from plantReadingOf(world).alarms',
        how: 'over time',
        via: probe('mains-fail sense'),
      },
      {
        what: "'alarms/accept': flashing → steady",
        how: 'instant',
        via: probe('mains-fail accept'),
      },
      {
        what: "'alarms/reset': steady and cleared → off",
        how: 'instant',
        via: probe('mains-fail reset'),
      },
    ],
    faults: [],
    events: {
      source: 'alarmEvents',
      actions: [{ type: 'plant/source', utility: 'power', on: false }],
      seconds: 1,
    },
  },
};

/** A sample of a node's event lines, from its source over a world before and after. */
export function sampleEvents(spec: ChangeSpec, world: World): GameEvent[] {
  if (!spec.events) return [];
  let after = spec.events.actions.reduce(applyAction, world);
  for (let t = 0; t < spec.events.seconds; t += 1) after = stepWorld(after, 1);
  const out: GameEvent[] = [];
  SOURCES[spec.events.source](world, after, { by: 'you' }, out);
  return out;
}

/** For the list of sources' completeness. */
export const KNOWN_EVENT_SOURCES = EVENT_SOURCES.length;
