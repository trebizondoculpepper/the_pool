import type { World } from '../../../game/world';
import { inspectionStatus } from '../../../game/plant/component-status';
import type { LookEntry } from './look-catalogue';
import { layoutRoom } from './room-equipment';
import { resolveRef } from './sim-graph/graph';
import type { SimGraph } from './sim-graph/graph';
import { nodeLink, nodePage } from './sim-graph/node-page';

/** One installed object's page, separate from its kind and its graph nodes. */
export const objectDetailLink = (room: string, ref: string) =>
  `bench.html?bench=object-detail&room=${encodeURIComponent(room)}&ref=${encodeURIComponent(ref)}`;

export interface ObjectDetailNode {
  id: string;
  name: string;
  relation: string;
  href: string;
  adapter?: string;
  fields: { name: string; value: unknown; unit?: string }[];
  drivers: string[];
}

export interface ObjectDetail {
  entry: LookEntry;
  time: number;
  position?: { x: number; y: number; z: number };
  parent?: { name: string; href: string };
  containment: { name: string; href: string; relation: string }[];
  nodes: ObjectDetailNode[];
  status?: string;
  behavior?: { name: string; source: string; functions: string[] };
  modelFinding?: string;
}

const BEHAVIOR_MODELS: Readonly<
  Record<string, { name: string; source: string; functions: string[] }>
> = {
  'pool-temperature-controller': {
    name: 'Pool temperature controller and valve actuator',
    source: 'src/game/plant/pool-temperature-control.ts',
    functions: ['stepPoolTemperatureControl', 'temperatureControlOf'],
  },
};

/** Build a read-only instance record from the catalogue, executing graph and world. */
export function objectDetail(
  entry: LookEntry,
  entries: readonly LookEntry[],
  graph: SimGraph,
  world: World,
): ObjectDetail {
  const parent = entry.parent
    ? entries.find(
        (e) =>
          e.room === entry.room &&
          e.tag?.toLowerCase() === entry.parent?.toLowerCase(),
      )
    : undefined;
  const placed = entry.itemKey
    ? layoutRoom(entry.room)?.placed.find(
        (p) => p.item.key === entry.itemKey && p.item.label === entry.title,
      )
    : undefined;
  const targets = entry.model ? resolveRef(entry.room, entry.model) : [];
  const direct = targets.length
    ? targets.map((t) => ({ id: t.page, relation: 'visual model binding' }))
    : [...graph.nodes.values()]
        .filter(
          (n) =>
            n.room === entry.room &&
            !!entry.tag &&
            n.tag?.toLowerCase() === entry.tag.toLowerCase(),
        )
        .map((n) => ({ id: n.id, relation: 'tag match' }));
  const seen = new Set<string>();
  const nodes: ObjectDetailNode[] = [];
  const add = (id: string, relation: string) => {
    if (seen.has(id)) return;
    const n = graph.nodes.get(id);
    if (!n) return;
    seen.add(id);
    const page = nodePage(graph, id, { world });
    if (!page) return;
    nodes.push({
      id,
      name: n.name,
      relation,
      href: nodeLink(id),
      ...(page.state.adapter ? { adapter: page.state.adapter } : {}),
      fields: page.state.fields.map((f) => ({
        name: f.name,
        value: f.value,
        ...(f.unit ? { unit: f.unit } : {}),
      })),
      drivers: page.change.drivers.map((d) => d.what),
    });
    for (const child of page.what.members) add(child, `contained by ${n.name}`);
  };
  for (const t of direct) add(t.id, t.relation);
  const containment = [
    ...new Map(
      nodes.flatMap((n) => {
        const node = graph.nodes.get(n.id);
        const parents = [
          ...(node?.parent ? [node.parent] : []),
          ...graph.edges
            .filter((edge) => edge.kind === 'contains' && edge.to === n.id)
            .map((edge) => edge.from),
        ];
        return parents.flatMap((id) => {
          const p = graph.nodes.get(id);
          return p
            ? [
                [
                  id,
                  {
                    name: p.name,
                    href: nodeLink(id),
                    relation: 'graph containment',
                  },
                ] as const,
              ]
            : [];
        });
      }),
    ).values(),
  ];
  const status = entry.tag ? inspectionStatus(world, entry.tag) : undefined;
  return {
    entry,
    time: world.time,
    ...(placed ? { position: { x: placed.x, y: placed.y, z: placed.z } } : {}),
    ...(parent
      ? {
          parent: {
            name: `${parent.ref} · ${parent.title}`,
            href: objectDetailLink(parent.room, parent.ref),
          },
        }
      : {}),
    containment,
    nodes,
    ...(status ? { status } : {}),
    ...(BEHAVIOR_MODELS[entry.kind]
      ? { behavior: BEHAVIOR_MODELS[entry.kind] }
      : {}),
    ...(!nodes.length
      ? {
          modelFinding: entry.model
            ? `The catalogue binding ${entry.model} does not resolve to a graph node.`
            : 'No executing simulation-graph node is registered for this object.',
        }
      : {}),
  };
}
