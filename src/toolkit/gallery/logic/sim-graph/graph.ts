import type {
  Fitting,
  PlumbEdge,
} from '../../../../game/plant/plumbing-expansion';
import { SCHEMATICS } from '../../../../game/plant/schematics';
import { olympicPlumbing } from '../olympic-plumbing';
import { alongOf } from '../room-audit';
import { roomNetwork } from '../world-in-model';
import { BOUNDARY_KINDS, graphTier } from './tiers';
import type { GraphSort, GraphTier } from './tiers';

/**
 * The simulation graph (mission 138, `doc/plans/138-simulation-graph-audit.md`):
 * one id scheme for every node of the simulation, `<room>/<sort>:<id>`,
 * the rooms' enhanced networks read as active nodes joined by collapsed
 * connector runs, and the edges and relations the other sources add.
 * Every edge carries its kind, direction and provenance (`via`). Topology
 * is not causation: a `connects` edge is the link's port orientation, not
 * proof of an effect. Shared with 129's room audit (the same segment walk,
 * `alongOf`) and, by parity test, with 134's connections. Pure.
 */

/** A node's id: `<room>/<sort>:<id>` (`plant_pool_03/fitting:jacuzzi.drain`). */
export type NodeId = string;

export const nodeId = (room: string, sort: GraphSort, id: string): NodeId =>
  `${room}/${sort}:${id}`;

const SORTS: readonly GraphSort[] = [
  'node',
  'fitting',
  'link',
  'part',
  'alarm',
  'state',
];

/**
 * A graph id's room, sort and id; none for anything else. Not a `blocks.ts`
 * address: `parseAddress` would read `part:cabinet/pump` as a field.
 */
export function parseNodeId(
  id: string,
): { room: string; sort: GraphSort; id: string } | undefined {
  const slash = id.indexOf('/');
  if (slash <= 0) return undefined;
  const rest = id.slice(slash + 1);
  const colon = rest.indexOf(':');
  if (colon <= 0) return undefined;
  const sort = rest.slice(0, colon) as GraphSort;
  const local = rest.slice(colon + 1);
  if (!SORTS.includes(sort) || !local) return undefined;
  return { room: id.slice(0, slash), sort, id: local };
}

/** The room-local model ref of a node id (`node:cabinet`), as 129's rows carry it. */
export const localRef = (id: NodeId) => id.slice(id.indexOf('/') + 1);

/** The brief's media: the schematic's, `control` read as `signal`. */
export type Medium =
  | 'water'
  | 'heat'
  | 'power'
  | 'chemical'
  | 'gas'
  | 'air'
  | 'oil'
  | 'flue'
  | 'signal';

export const mediumOf = (m: PlumbEdge['medium']): Medium =>
  m === 'control' ? 'signal' : m;

/** Why an edge or relation exists: a file and symbol, or a declared table entry and the test that probes it. */
export type Provenance =
  | { file: string; symbol: string }
  | { table: string; entry: string; probe: string };

export const viaText = (v: Provenance) =>
  'file' in v
    ? `${v.file} · ${v.symbol}`
    : `${v.table}[${v.entry}] · probed by ${v.probe}`;

/** One end of a connector run: an active element, a boundary, or a dead end (a passive piece with nothing beyond). */
export interface RunEnd {
  /** Its room-local model ref: `node:cabinet`, `fitting:jacuzzi.drain`. */
  ref: string;
  /** Its port on the run; a fitting's `in` or `out`. */
  port: string;
  end: 'active' | 'boundary' | 'dead end';
}

/**
 * A connector run: the passive pieces between two active nodes (or an
 * active node and a boundary), from the upstream end (the link's source
 * side) on. `id` is `run:<room>/<first link>/<index>`, `index` its place
 * among the runs starting on that link.
 */
export interface ConnectorRun {
  id: string;
  room: string;
  medium: Medium;
  /** The links it spans, in order. */
  links: string[];
  /** Its pieces in order: `link:…`, and any passive `node:…` or `fitting:…` between. */
  pieces: string[];
  from: RunEnd;
  to: RunEnd;
  /** It joins two active nodes, or an active node and a boundary. */
  justified: boolean;
}

export interface GraphNode {
  id: NodeId;
  room: string;
  sort: GraphSort;
  /** The schematic's kind, the fitting's, or the part's, alarm's or leaf's. */
  kind: string;
  name: string;
  tier: GraphTier;
  /** A boundary of its room's network: a run may end at it. */
  boundary?: true;
  /** Its derived tag, where it has one (never written by hand). */
  tag?: string;
  /** The node it is a part of. */
  parent?: NodeId;
  /** Its normal state, from the schematic (a fitting's `normally`). */
  normally?: 'open' | 'closed';
  /** Where its state lives in a `blocks.ts` tree, if it does. */
  address?: string;
}

export type EdgeKind = 'connects' | 'contains' | 'feeds' | 'raises';

export interface GraphEdge {
  from: NodeId;
  /** Null where the code names no port ("no port in the model"). */
  fromPort: string | null;
  to: NodeId;
  toPort: string | null;
  kind: EdgeKind;
  direction: 'forward' | 'both';
  /** Null for `raises`. */
  medium: Medium | null;
  via: Provenance;
  /** The collapsed run of a `connects` edge. */
  run?: ConnectorRun;
}

/** A control on a world object, and the node it works. */
export interface ControlRelation {
  control: { room: string; ref: string; key: string; label: string };
  target: NodeId | 'unresolved';
  /** What the descriptor named. */
  named: string;
  via: Provenance;
}

/** A reading on a world object, and the node it reads. */
export interface ReadingRelation {
  reading: { room: string; ref: string; key: string; label: string };
  target: NodeId | 'unknown';
  via: Provenance;
}

/** A board and its copy: both show one world state. */
export interface CopyRelation {
  board: NodeId;
  copy: NodeId;
  via: Provenance;
}

export interface Relations {
  controls: readonly ControlRelation[];
  readings: readonly ReadingRelation[];
  copies: readonly CopyRelation[];
}

export interface SimGraph {
  nodes: ReadonlyMap<NodeId, GraphNode>;
  edges: readonly GraphEdge[];
  runs: ReadonlyMap<string, ConnectorRun>;
  /** The rooms with a model network. */
  rooms: readonly string[];
  relations: Relations;
}

/** What one source adds. */
export interface GraphSource {
  nodes?: readonly GraphNode[];
  edges?: readonly GraphEdge[];
  runs?: readonly ConnectorRun[];
  rooms?: readonly string[];
}

/** The graph from its sources; relations are resolved against it afterwards. */
export function buildGraph(
  sources: readonly GraphSource[],
  relations?: (g: SimGraph) => Relations,
): SimGraph {
  const nodes = new Map<NodeId, GraphNode>();
  const runs = new Map<string, ConnectorRun>();
  const edges: GraphEdge[] = [];
  const rooms: string[] = [];
  for (const s of sources) {
    for (const n of s.nodes ?? []) if (!nodes.has(n.id)) nodes.set(n.id, n);
    for (const r of s.runs ?? []) runs.set(r.id, r);
    edges.push(...(s.edges ?? []));
    rooms.push(...(s.rooms ?? []));
  }
  const g: SimGraph = {
    nodes,
    edges,
    runs,
    rooms,
    relations: { controls: [], readings: [], copies: [] },
  };
  return relations ? { ...g, relations: relations(g) } : g;
}

/** A neighbour along one edge. */
export interface Neighbour {
  node: NodeId;
  edge: GraphEdge;
}

/**
 * A node's direct neighbours: `down` along the edges out of it (and both
 * ways' edges), `up` along those into it. The hook for the later impact
 * search, which must choose which edge kinds it walks.
 */
export function neighbours(
  graph: SimGraph,
  id: NodeId,
  direction: 'down' | 'up',
  filter: {
    media?: readonly (Medium | null)[];
    kinds?: readonly EdgeKind[];
  } = {},
): Neighbour[] {
  const ok = (e: GraphEdge) =>
    (!filter.media || filter.media.includes(e.medium)) &&
    (!filter.kinds || filter.kinds.includes(e.kind));
  const out: Neighbour[] = [];
  for (const e of graph.edges) {
    if (!ok(e)) continue;
    if (direction === 'down') {
      if (e.from === id) out.push({ node: e.to, edge: e });
      else if (e.direction === 'both' && e.to === id)
        out.push({ node: e.from, edge: e });
    } else {
      if (e.to === id) out.push({ node: e.from, edge: e });
      else if (e.direction === 'both' && e.from === id)
        out.push({ node: e.to, edge: e });
    }
  }
  return out;
}

/**
 * The later impact search (deferred by the owner, 2026-11-02, to its own
 * mission): a breadth-first walk over `neighbours` from a node, listing
 * every node reached and the path of edges to it. Typed here, not built.
 */
export interface ImpactSearch {
  walk(
    graph: SimGraph,
    from: NodeId,
    direction: 'down' | 'up',
    filter?: { media?: readonly Medium[]; kinds?: readonly EdgeKind[] },
  ): { node: NodeId; path: GraphEdge[] }[];
}

// --- The rooms' networks -------------------------------------------------

/** A room's enhanced network, as the graph reads it. */
export interface RoomNet {
  room: string;
  /** Its room code (the first part of its tags). */
  code?: string;
  nodes: ReadonlyMap<
    string,
    { id: string; kind: string; name: string; code?: string }
  >;
  fittings: ReadonlyMap<string, Fitting>;
  links: readonly PlumbEdge[];
  /** Each link's fittings in order (129's `alongOf`). */
  along: ReadonlyMap<string, readonly string[]>;
  via: Provenance;
}

const OLYMPIC_ROOM = 'plant_pool_02';

/** Every room with a model network: the schematics' and the Olympic plant room. */
export const NETWORK_ROOMS: readonly string[] = [
  ...Object.keys(SCHEMATICS),
  OLYMPIC_ROOM,
];

const nets = new Map<string, RoomNet | undefined>();

/** A room's network, built once and cached; none for a room without one. */
export function roomNet(room: string): RoomNet | undefined {
  if (nets.has(room)) return nets.get(room);
  const built = roomNetwork(room);
  let net: RoomNet | undefined;
  if (built) {
    const schematic = SCHEMATICS[room];
    const labels =
      room === OLYMPIC_ROOM
        ? new Map(olympicPlumbing().items.map((i) => [i.key, i.label]))
        : new Map<string, string>();
    const given = new Map(
      (schematic?.nodes ?? []).map((n) => [n.id, n] as const),
    );
    const fittings = new Map(built.expansion.fittings.map((f) => [f.id, f]));
    const nodes = new Map<
      string,
      { id: string; kind: string; name: string; code?: string }
    >();
    for (const n of built.expansion.nodes) {
      if (fittings.has(n.id)) continue;
      const s = given.get(n.id);
      const named = n as { name?: string; code?: string };
      nodes.set(n.id, {
        id: n.id,
        kind: n.kind,
        name: s?.name ?? named.name ?? labels.get(n.id) ?? n.id,
        ...((s?.code ?? named.code) ? { code: s?.code ?? named.code } : {}),
      });
    }
    net = {
      room,
      ...(schematic ? { code: schematic.code } : { code: 'PL2' }),
      nodes,
      fittings,
      links: built.links,
      along: alongOf(built.expansion),
      via:
        room === OLYMPIC_ROOM
          ? {
              file: 'src/toolkit/gallery/logic/olympic-plumbing.ts',
              symbol: 'olympicPlumbing',
            }
          : {
              file: 'src/game/plant/schematics.ts',
              symbol: `SCHEMATICS.${room}`,
            },
    };
  }
  nets.set(room, net);
  return net;
}

/** One segment of a link: two neighbours in its sequence `node → fitting … → node`. */
export interface Segment {
  link: PlumbEdge;
  /** Its place along the link, from 0. */
  index: number;
  a: string;
  aPort: string;
  b: string;
  bPort: string;
}

/** Each link's segments, in order: the same walk as 129's `connectionsOf`. */
export function segmentsOf(net: RoomNet): Segment[] {
  const out: Segment[] = [];
  for (const l of net.links) {
    const fs = net.along.get(l.id) ?? [];
    const seq = [
      `node:${l.sourceId}`,
      ...fs.map((f) => `fitting:${f}`),
      `node:${l.targetId}`,
    ];
    for (let i = 0; i + 1 < seq.length; i += 1)
      out.push({
        link: l,
        index: i,
        a: seq[i],
        aPort: i === 0 ? l.sourcePort : 'out',
        b: seq[i + 1],
        bPort: i + 1 === seq.length - 1 ? l.targetPort : 'in',
      });
  }
  return out;
}

/** An element's kind and tier in its room's network. */
export function elementOf(net: RoomNet, ref: string) {
  const id = ref.slice(ref.indexOf(':') + 1);
  if (ref.startsWith('fitting:')) {
    const f = net.fittings.get(id);
    const kind = f?.kind ?? 'unknown';
    return { kind, tier: graphTier('fitting', kind), boundary: false };
  }
  const kind = net.nodes.get(id)?.kind ?? 'unknown';
  return {
    kind,
    tier: graphTier('node', kind),
    boundary: BOUNDARY_KINDS.has(kind),
  };
}

const isActive = (net: RoomNet, ref: string) =>
  elementOf(net, ref).tier !== 'connector';

/**
 * A room's connector runs: from each active element (and each passive
 * piece nothing feeds), forward along its links through passive pieces,
 * branching where a passive node does, to the next active element, a
 * boundary, or a dead end.
 */
export function roomRuns(net: RoomNet): ConnectorRun[] {
  const segs = segmentsOf(net);
  const outOf = new Map<string, Segment[]>();
  const into = new Set<string>();
  for (const s of segs) {
    if (!outOf.has(s.a)) outOf.set(s.a, []);
    outOf.get(s.a)!.push(s);
    into.add(s.b);
  }
  // Runs start at every active element, and at any passive piece or
  // boundary nothing in the room feeds.
  const starts = (ref: string) => isActive(net, ref) || !into.has(ref);
  const counter = new Map<string, number>();
  const runs: ConnectorRun[] = [];
  const endOf = (ref: string, port: string): RunEnd => ({
    ref,
    port,
    end: isActive(net, ref)
      ? 'active'
      : elementOf(net, ref).boundary
        ? 'boundary'
        : 'dead end',
  });
  for (const first of segs) {
    if (!starts(first.a)) continue;
    const from = endOf(first.a, first.aPort);
    const walk = (
      s: Segment,
      links: string[],
      pieces: string[],
      seen: Set<string>,
    ) => {
      const ls = links.at(-1) === s.link.id ? links : [...links, s.link.id];
      const ps =
        pieces.at(-1) === `link:${s.link.id}`
          ? pieces
          : [...pieces, `link:${s.link.id}`];
      const nexts = outOf.get(s.b) ?? [];
      const passive = !isActive(net, s.b) && !elementOf(net, s.b).boundary;
      if (!passive || !nexts.length || seen.has(s.b)) {
        const to = endOf(s.b, s.bPort);
        const n = counter.get(first.link.id) ?? 0;
        counter.set(first.link.id, n + 1);
        runs.push({
          id: `run:${net.room}/${first.link.id}/${n}`,
          room: net.room,
          medium: mediumOf(first.link.medium),
          links: ls,
          pieces: ps,
          from,
          to,
          justified:
            (from.end === 'active' && to.end !== 'dead end') ||
            (to.end === 'active' && from.end === 'boundary'),
        });
        return;
      }
      for (const n of nexts)
        walk(
          n,
          ls,
          n.link.id === s.link.id ? ps : [...ps, s.b],
          new Set([...seen, s.b]),
        );
    };
    walk(first, [], [], new Set([first.a]));
  }
  return runs;
}

const runCache = new Map<string, ConnectorRun[]>();
/** A room's runs, cached. */
export function runsOf(room: string): ConnectorRun[] {
  if (!runCache.has(room)) {
    const net = roomNet(room);
    runCache.set(room, net ? roomRuns(net) : []);
  }
  return runCache.get(room)!;
}

/** Where a ref resolves to: a node's page, at a run's anchor if it is a connector. */
export interface ResolvedTarget {
  page: NodeId;
  anchor?: string;
  label: string;
}

export const runAnchor = (run: ConnectorRun) => `run-${run.id}`;

/**
 * Where a room's model ref sends the reader (plan section 2): an active
 * node's or fitting's ref to its own page; a passive fitting's to its one
 * run; a `link:` ref to every run the link holds, in order, each on the
 * page of its upstream active end (the far active end where only a
 * boundary is upstream), at the run's anchor. Several targets are listed
 * by the caller, never one picked.
 */
export function resolveRef(room: string, ref: string): ResolvedTarget[] {
  const net = roomNet(room);
  if (!net) return [];
  const colon = ref.indexOf(':');
  const sort = ref.slice(0, colon);
  const id = ref.slice(colon + 1);
  const pageOfRun = (r: ConnectorRun): ResolvedTarget[] => {
    const end =
      r.from.end === 'active'
        ? r.from
        : r.to.end === 'active'
          ? r.to
          : undefined;
    return end
      ? [
          {
            page: `${room}/${end.ref}`,
            anchor: runAnchor(r),
            label: `${r.links.join(' → ')}: ${r.from.ref} → ${r.to.ref}`,
          },
        ]
      : [];
  };
  if (sort === 'node' || sort === 'fitting') {
    const exists = sort === 'node' ? net.nodes.has(id) : net.fittings.has(id);
    if (!exists) return [];
    if (isActive(net, ref))
      return [{ page: `${room}/${ref}`, label: elementName(net, ref) }];
    return runsOf(room)
      .filter((r) => r.pieces.includes(ref))
      .flatMap(pageOfRun);
  }
  if (sort === 'link') {
    return runsOf(room)
      .filter((r) => r.links.includes(id))
      .flatMap(pageOfRun);
  }
  return [];
}

/** An element's name in its network. */
export function elementName(net: RoomNet, ref: string): string {
  const id = ref.slice(ref.indexOf(':') + 1);
  if (ref.startsWith('node:')) return net.nodes.get(id)?.name ?? id;
  const f = net.fittings.get(id);
  return f?.role ? `${id} (${f.role})` : id;
}

/**
 * A model element's segment neighbours, connectors shown (129's
 * `connectionsOf` without its scene labels): along each link it is on,
 * the element on either side.
 */
export function segmentNeighbours(
  room: string,
  ref: string,
): {
  link: string;
  medium: PlumbEdge['medium'];
  neighbour: string;
  name: string;
}[] {
  const net = roomNet(room);
  if (!net) return [];
  const out: {
    link: string;
    medium: PlumbEdge['medium'];
    neighbour: string;
    name: string;
  }[] = [];
  // In link order, then along each link, as 129 walks it.
  const byLink = new Map<string, Segment[]>();
  for (const s of segmentsOf(net)) {
    if (!byLink.has(s.link.id)) byLink.set(s.link.id, []);
    byLink.get(s.link.id)!.push(s);
  }
  for (const segs of byLink.values()) {
    const seq = [segs[0].a, ...segs.map((s) => s.b)];
    seq.forEach((r, i) => {
      if (r !== ref) return;
      for (const j of [i - 1, i + 1]) {
        const n = seq[j];
        if (!n) continue;
        const nid = n.slice(n.indexOf(':') + 1);
        out.push({
          link: segs[0].link.id,
          medium: segs[0].link.medium,
          neighbour: n,
          name: n.startsWith('node:') ? (net.nodes.get(nid)?.name ?? nid) : nid,
        });
      }
    });
  }
  return out;
}

/** A node's relations: the controls acting on it, the readings reading it, the copies it is in. */
export function relationsOf(graph: SimGraph, id: NodeId): Relations {
  return {
    controls: graph.relations.controls.filter((c) => c.target === id),
    readings: graph.relations.readings.filter((r) => r.target === id),
    copies: graph.relations.copies.filter(
      (c) => c.board === id || c.copy === id,
    ),
  };
}
