import { CHANGEOVER_POSITIONS } from '../../../../game/plant/changeover';
import { ISOLATORS } from '../../../../game/plant/services';
import type {
  IsolatorName,
  ServiceRoom,
} from '../../../../game/plant/services';
import { jacuzziPumpCalled } from '../../../../game/plant/jacuzzi-cabinet';
import { NO_FLOW_TRIP } from '../../../../game/plant/jacuzzi-cabinet';
import { jacuzziCabinetInputs } from '../../../../game/world';
import type { World } from '../../../../game/world';
import type { AlarmId } from '../control-room-demo';
import { parseNodeId } from './graph';
import type { GraphNode } from './graph';
import { SERVICE_ROOMS } from './sources/parts';

/**
 * Section 4.3, what state a node holds (mission 138): a state adapter per
 * node kind, built from what already says where state lives (the
 * installed valves' keys, `plant.feeders`, `plant.isolators`, the
 * jacuzzi's cabinet, the annunciator). Each field says its type, its
 * range or values, whether it is saved in the world (so in `save.ts`), its
 * normal from the schematic, and where it lives. A node with none shows
 * "state not found in the world", never Off. Pure.
 */

export interface FieldSpec {
  name: string;
  /** Where in `World` it lives, or how it is derived. */
  path: string;
  type: string;
  unit?: string;
  values?: readonly string[];
  saved: boolean;
  normal?: string;
}

export interface StateAdapter {
  /** The adapter's name, for the page. */
  name: string;
  fields: readonly FieldSpec[];
  read(world: World): Record<string, unknown>;
}

const BOOL = ['true', 'false'] as const;

/** The world's key for a fitting kept among the installed valves. */
const valveAdapter = (n: GraphNode, id: string): StateAdapter => {
  const fields: FieldSpec[] = [
    {
      name: 'open',
      path: `installedValves['${id}']`,
      type: 'boolean',
      values: BOOL,
      saved: true,
      ...(n.normally ? { normal: String(n.normally === 'open') } : {}),
    },
  ];
  // The jacuzzi's drain valve is coupled to its pool's drain-down (`jacuzziDrainDown`).
  const drain = id === 'jacuzzi.drain';
  if (drain)
    fields.push({
      name: 'drainDown',
      path: 'pools.pool_03.drainDown',
      type: 'boolean',
      values: BOOL,
      saved: true,
      normal: 'false',
    });
  return {
    name: drain
      ? 'installed valve, coupled to the pool’s drain-down'
      : 'installed valve',
    fields,
    read: (w) => ({
      open: w.installedValves[id],
      ...(drain ? { drainDown: w.pools.pool_03.drainDown } : {}),
    }),
  };
};

/** The machines' named isolators, by their fitting id. */
export const ISOLATOR_OF: Readonly<Record<string, IsolatorName>> = {
  'jacuzzi.isolator': 'Jacuzzi cabinet isolator',
};

export function stateAdapter(
  n: GraphNode,
  world: World,
): StateAdapter | undefined {
  const p = parseNodeId(n.id);
  if (!p) return undefined;
  if (p.sort === 'fitting' && ISOLATOR_OF[p.id]) {
    const name = ISOLATOR_OF[p.id];
    return {
      name: 'machine isolator',
      fields: [
        {
          name: 'on',
          path: `plant.isolators['${name}']`,
          type: 'boolean',
          values: BOOL,
          saved: true,
          normal: 'true',
        },
      ],
      read: (w) => ({ on: w.plant.isolators[name] }),
    };
  }
  if (p.sort === 'fitting' && p.id in world.installedValves)
    return valveAdapter(n, p.id);
  if (n.id === 'switch_room/node:incoming')
    return {
      name: 'incoming supply',
      fields: [
        {
          name: 'power',
          path: 'plant.sources.power',
          type: 'boolean',
          values: BOOL,
          saved: true,
          normal: 'true',
        },
      ],
      read: (w) => ({ power: w.plant.sources.power }),
    };
  if (n.id === 'switch_room/node:changeover')
    return {
      name: 'changeover switch',
      fields: [
        {
          name: 'position',
          path: 'plant.changeover',
          type: 'ChangeoverPosition',
          values: CHANGEOVER_POSITIONS,
          saved: true,
          normal: 'I',
        },
      ],
      read: (w) => ({ position: w.plant.changeover }),
    };
  if (
    p.sort === 'part' &&
    p.room === 'switch_room' &&
    p.id.startsWith('rooms/')
  ) {
    const room = p.id.slice('rooms/'.length) as ServiceRoom;
    if (!SERVICE_ROOMS.includes(room)) return undefined;
    return {
      name: 'room feeder',
      fields: [
        {
          name: 'on',
          path: `plant.feeders.${room}`,
          type: 'boolean',
          values: BOOL,
          saved: true,
          normal: 'true',
        },
      ],
      read: (w) => ({ on: w.plant.feeders[room] }),
    };
  }
  if (n.id === 'plant_pool_03/part:cabinet/pump')
    return {
      name: 'jacuzzi cabinet pump',
      fields: [
        {
          name: 'running',
          path: 'jacuzziPumpCalled(jacuzziCabinet, jacuzziCabinetInputs(world))',
          type: 'boolean',
          values: BOOL,
          saved: false,
          normal: 'true',
        },
        {
          name: 'power',
          path: 'jacuzziCabinet.power',
          type: 'boolean',
          values: BOOL,
          saved: true,
          normal: 'true',
        },
        {
          name: 'trip',
          path: 'jacuzziCabinet.trip',
          type: "'' | 'no-flow'",
          values: ['', 'no-flow'],
          saved: true,
          normal: '',
        },
        {
          name: 'noFlow',
          path: 'jacuzziCabinet.noFlow',
          type: 'number',
          unit: `s (trips at ${NO_FLOW_TRIP})`,
          saved: true,
          normal: '0',
        },
      ],
      read: (w) => ({
        running: jacuzziPumpCalled(w.jacuzziCabinet, jacuzziCabinetInputs(w)),
        power: w.jacuzziCabinet.power,
        trip: w.jacuzziCabinet.trip,
        noFlow: w.jacuzziCabinet.noFlow,
      }),
    };
  if (p.sort === 'alarm') {
    const id = p.id as AlarmId;
    if (!(id in world.annunciator.windows)) return undefined;
    return {
      name: 'annunciator window',
      fields: [
        {
          name: 'window',
          path: `annunciator.windows['${id}']`,
          type: 'AlarmWindow',
          values: ['off', 'flashing', 'steady'],
          saved: true,
          normal: 'off',
        },
        {
          name: 'present',
          path: `annunciator.present['${id}']`,
          type: 'boolean',
          values: BOOL,
          saved: true,
          normal: 'false',
        },
      ],
      read: (w) => ({
        window: w.annunciator.windows[id],
        present: w.annunciator.present[id],
      }),
    };
  }
  if (n.id === 'world/state:controlRoomMode')
    return {
      name: 'world leaf',
      fields: [
        {
          name: 'mode',
          path: 'controlRoomMode',
          type: 'ControlRoomMode',
          values: ['old', 'new'],
          saved: true,
          normal: 'old',
        },
      ],
      read: (w) => ({ mode: w.controlRoomMode }),
    };
  return undefined;
}

/** For the isolator list's completeness test. */
export const KNOWN_ISOLATORS = ISOLATORS;
