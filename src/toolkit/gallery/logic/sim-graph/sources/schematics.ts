import { INSTALLED_VALVES } from '../../../../../game/plant/installed-valves';
import { MODEL_VALVES } from '../../../../../game/plant/model-valves';
import { NETWORK_ROOMS, elementOf, nodeId, roomNet, runsOf } from '../graph';
import type { GraphEdge, GraphNode, GraphSource, RoomNet } from '../graph';

/**
 * The rooms' networks as graph nodes, runs and `connects` edges (mission
 * 138): every schematic node and fitting of each room's enhanced network
 * (the schematics', the Olympic plant room's), each run collapsed into one
 * edge between its two active ends, directed by the link's port
 * orientation. Tags are derived: a node's from its room's code and its
 * own (`PL3-CAB1`), a fitting's from the model's valves or the installed
 * register. Pure.
 */

const installedTag = new Map(
  Object.values(INSTALLED_VALVES).map((v) => [v.assetId, v.tag]),
);

/** A fitting's derived tag: the model's valves first, then the register. */
export function fittingTag(room: string, id: string): string | undefined {
  return (
    MODEL_VALVES.find((v) => v.room === room && v.id === id)?.tag ??
    installedTag.get(id)
  );
}

/** A room's nodes: every schematic node and fitting. */
export function roomNodes(net: RoomNet): GraphNode[] {
  const out: GraphNode[] = [];
  for (const n of net.nodes.values()) {
    const e = elementOf(net, `node:${n.id}`);
    out.push({
      id: nodeId(net.room, 'node', n.id),
      room: net.room,
      sort: 'node',
      kind: n.kind,
      name: n.name,
      tier: e.tier,
      ...(e.boundary ? { boundary: true as const } : {}),
      ...(n.code && net.code ? { tag: [net.code, n.code].join('-') } : {}),
    });
  }
  for (const f of net.fittings.values()) {
    const tag = fittingTag(net.room, f.id);
    out.push({
      id: nodeId(net.room, 'fitting', f.id),
      room: net.room,
      sort: 'fitting',
      kind: f.kind,
      name: f.role ? `${f.id} (${f.role})` : f.id,
      tier: elementOf(net, `fitting:${f.id}`).tier,
      normally: f.normally,
      ...(tag ? { tag } : {}),
    });
  }
  return out;
}

/** A room's `connects` edges: one per run between two active ends. */
export function roomEdges(net: RoomNet): GraphEdge[] {
  return runsOf(net.room)
    .filter((r) => r.from.end === 'active' && r.to.end === 'active')
    .map((r) => ({
      from: `${net.room}/${r.from.ref}`,
      fromPort: r.from.port,
      to: `${net.room}/${r.to.ref}`,
      toPort: r.to.port,
      kind: 'connects' as const,
      direction: 'forward' as const,
      medium: r.medium,
      via:
        'file' in net.via
          ? {
              file: net.via.file,
              symbol: `${net.via.symbol} link "${r.links[0]}"`,
            }
          : net.via,
      run: r,
    }));
}

/** A schematic fitting commanded by a controller node, distinct from its physical pipe run. */
export function roomControlEdges(net: RoomNet): GraphEdge[] {
  return [...net.fittings.values()].flatMap((fitting) => {
    const source = fitting.controlledBy;
    if (!source) return [];
    if (!net.nodes.has(source.node))
      throw new Error(
        `Fitting ${net.room}/${fitting.id} has no controller node ${source.node}`,
      );
    return [
      {
        from: nodeId(net.room, 'node', source.node),
        fromPort: source.port,
        to: nodeId(net.room, 'fitting', fitting.id),
        toPort: 'command',
        kind: 'feeds' as const,
        direction: 'forward' as const,
        medium: 'signal' as const,
        via:
          'file' in net.via
            ? {
                file: net.via.file,
                symbol: `${net.via.symbol} fitting "${fitting.id}" controlledBy`,
              }
            : net.via,
      },
    ];
  });
}

/** Every room network's contribution. */
export function schematicSources(
  rooms: readonly string[] = NETWORK_ROOMS,
): GraphSource[] {
  return rooms.flatMap((room) => {
    const net = roomNet(room);
    return net
      ? [
          {
            nodes: roomNodes(net),
            edges: [
              ...roomEdges(net),
              ...roomControlEdges(net),
              ...(room === 'plant_pool_01' || room === 'plant_pool_02'
                ? (['temperature-controller', 'music-source'] as const).map(
                    (id) => ({
                      from: nodeId(room, 'node', 'instrument-rack'),
                      fromPort: null,
                      to: nodeId(room, 'node', id),
                      toPort: null,
                      kind: 'contains' as const,
                      direction: 'forward' as const,
                      medium: null,
                      via: {
                        file: 'src/game/plant/lounge-schematic.ts',
                        symbol:
                          'instrument rack contains its controller and music source',
                      },
                    }),
                  )
                : []),
            ],
            runs: runsOf(room),
            rooms: [room],
          },
        ]
      : [];
  });
}
