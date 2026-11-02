import { installedTagOf } from '../../../../../game/plant/installed-asset-ids';
import { ALARM_TEXT, ANNUNCIATOR_ALARMS } from '../../control-room-demo';
import type { AlarmId } from '../../control-room-demo';
import { PANEL_PAGE_ORDER } from '../../bridge-pages';
import { nodeId } from '../graph';
import type {
  GraphEdge,
  GraphNode,
  GraphSource,
  NodeId,
  Provenance,
} from '../graph';

/**
 * Alarms (mission 138, plan section 3, join 8): each window of the plant's
 * annunciator is a node, `control_room/alarm:<id>`, a part of the
 * annunciator; its state `annunciator.windows[id]`. `ALARM_SOURCES` names
 * the nodes each window's condition reads (the condition itself is code,
 * `plantReadingOf(...).alarms`): declared, checked by probe tests that
 * change one source at a time from a fresh world and step it
 * (`alarm-sources.test.ts`), never trusted. Declared so far only for the
 * example alarm; the rest show their sources as not declared. Pure.
 */

export const ALARM_ROOM = 'control_room';

export const alarmNode = (id: AlarmId): NodeId =>
  nodeId(ALARM_ROOM, 'alarm', id);

/** The nodes each window reads; only declared entries, each probed. */
export const ALARM_SOURCES: Partial<Record<AlarmId, readonly NodeId[]>> = {
  // `!plant.sources.power` (world-reading.ts): the incoming supply.
  'mains-fail': [nodeId('switch_room', 'node', 'incoming')],
};

/** A display showing every window of the one `AnnunciatorState`: found from the components that read `world.annunciator`. */
export interface AnnunciatorDisplay {
  room: string;
  /** Its ref (mission 125): its tag. */
  ref: string;
  name: string;
  /** Whether its ACCEPT and RESET work the shared state. */
  controls: boolean;
  via: Provenance;
}

const bridgeCode = (short: string) =>
  PANEL_PAGE_ORDER.find((p) => p.short === short)?.code;

/** Every board and console that shows the plant's annunciator. */
export function annunciatorDisplays(): AnnunciatorDisplay[] {
  const board = installedTagOf(ALARM_ROOM, 'annunciator');
  const cp2 = bridgeCode('ANNUNCIATOR');
  const cc = bridgeCode('CENTRAL CTRL');
  return [
    ...(board
      ? [
          {
            room: ALARM_ROOM,
            ref: board,
            name: 'Alarm annunciator (the old control room)',
            controls: true,
            via: {
              file: 'src/toolkit/gallery/rooms/plant/control.ts',
              symbol: 'worldAnnunciator',
            },
          },
        ]
      : []),
    ...(cp2
      ? [
          {
            room: 'bridge',
            ref: cp2,
            name: 'Annunciator console (the bridge)',
            controls: true,
            via: {
              file: 'src/toolkit/gallery/views/bridge-console.ts',
              symbol: 'bridgeAnnunciator',
            },
          },
        ]
      : []),
    ...(cc
      ? [
          {
            room: 'bridge',
            ref: cc,
            name: 'Central Control (the bridge)',
            controls: true,
            via: {
              file: 'src/toolkit/gallery/views/bridge-console.ts',
              symbol: 'bridgeAnnunciator',
            },
          },
        ]
      : []),
  ];
}

export function alarmSources(): GraphSource[] {
  const nodes: GraphNode[] = ANNUNCIATOR_ALARMS.map((id) => ({
    id: alarmNode(id),
    room: ALARM_ROOM,
    sort: 'alarm',
    kind: 'annunciator-window',
    name: `${ALARM_TEXT[id].window.replace('\n', ' ')} (${ALARM_TEXT[id].room})`,
    tier: 'active',
  }));
  const edges: GraphEdge[] = Object.entries(ALARM_SOURCES).flatMap(
    ([id, sources]) =>
      (sources ?? []).map((from) => ({
        from,
        fromPort: null,
        to: alarmNode(id as AlarmId),
        toPort: null,
        kind: 'raises' as const,
        direction: 'forward' as const,
        medium: null,
        via: {
          table: 'ALARM_SOURCES',
          entry: id,
          probe: 'alarm-sources.test.ts',
        },
      })),
  );
  return [{ nodes, edges }];
}
