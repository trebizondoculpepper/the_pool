import { ROOM_SWITCH_FUSES } from '../../../../../game/plant/installed-feeders';
import { ROOM_SERVICES } from '../../../../../game/plant/services';
import type { ServiceRoom } from '../../../../../game/plant/services';
import { ROOM_NAMES } from '../../../../../game/plant/room-names';
import { mediumOf, nodeId, roomNet } from '../graph';
import type { GraphEdge, GraphNode, GraphSource, Medium } from '../graph';
import { PART_PORTS } from '../part-ports';

/**
 * Parts (mission 138, plan sections 2 and 3, join 2): nodes inside a
 * schematic node whose state the world keeps but the schematic does not
 * draw, joined to their parent by `contains` edges. The switch room's
 * aggregate `rooms` node has one feeder part per service room
 * (`ROOM_SWITCH_FUSES`, state `plant.feeders[room]`); the Jacuzzi cabinet
 * has its circulation pump (`PART_PORTS`). Pure.
 */

export const SWITCH_ROOM = 'switch_room';
export const FEEDERS_NODE = nodeId(SWITCH_ROOM, 'node', 'rooms');

export const SERVICE_ROOMS = Object.keys(ROOM_SERVICES) as ServiceRoom[];

/** A service room's feeder part in the switch room. */
export const feederPart = (room: ServiceRoom) =>
  nodeId(SWITCH_ROOM, 'part', `rooms/${room}`);

export function partSources(): GraphSource[] {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  for (const room of SERVICE_ROOMS) {
    const { tag } = ROOM_SWITCH_FUSES[room];
    nodes.push({
      id: feederPart(room),
      room: SWITCH_ROOM,
      sort: 'part',
      kind: 'room-feeder',
      name: `Feeder to the ${ROOM_NAMES[room] ?? room}`,
      tier: 'active',
      parent: FEEDERS_NODE,
      tag,
    });
    edges.push({
      from: FEEDERS_NODE,
      fromPort: null,
      to: feederPart(room),
      toPort: null,
      kind: 'contains',
      direction: 'forward',
      medium: 'power',
      via: {
        file: 'src/game/plant/installed-feeders.ts',
        symbol: `ROOM_SWITCH_FUSES.${room}, PlantServices.feeders`,
      },
    });
  }
  for (const [path, p] of Object.entries(PART_PORTS)) {
    const id = nodeId(p.room, 'part', path);
    const parent = nodeId(p.room, 'node', p.parent);
    nodes.push({
      id,
      room: p.room,
      sort: 'part',
      kind: p.kind,
      name: p.name,
      tier: 'active',
      parent,
    });
    const net = roomNet(p.room);
    for (const [port, parentPort] of Object.entries(p.ports)) {
      const link = net?.links.find(
        (l) =>
          (l.sourceId === p.parent && l.sourcePort === parentPort) ||
          (l.targetId === p.parent && l.targetPort === parentPort),
      );
      const medium: Medium | null = link ? mediumOf(link.medium) : null;
      const via = {
        table: 'PART_PORTS',
        entry: `${path}.${port}`,
        probe: 'part-ports.test.ts',
      };
      edges.push(
        p.inbound.includes(port)
          ? {
              from: parent,
              fromPort: parentPort,
              to: id,
              toPort: port,
              kind: 'contains',
              direction: 'forward',
              medium,
              via,
            }
          : {
              from: id,
              fromPort: port,
              to: parent,
              toPort: parentPort,
              kind: 'contains',
              direction: 'forward',
              medium,
              via,
            },
      );
    }
  }
  return [{ nodes, edges }];
}
