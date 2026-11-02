import { componentDescription } from '../../../../game/plant/equipment-catalogue';
import { ROOM_NAMES } from '../../../../game/plant/room-names';
import { isKindId } from '../../../../game/plant/equipment-kinds';
import type { GameEvent } from '../../../../game/events/game-event';
import type { World } from '../../../../game/world';
import type { LookEntry } from '../look-catalogue';
import { auditLink } from '../look-catalogue';
import { CHANGES, sampleEvents } from './drivers';
import type { Driver } from './drivers';
import { fullyCovered, roomCoverage } from './coverage';
import { simFlags } from './flags';
import type { FlagValue, SimFlag } from './flags';
import {
  localRef,
  neighbours,
  parseNodeId,
  relationsOf,
  runAnchor,
  runsOf,
  viaText,
} from './graph';
import type {
  ConnectorRun,
  GraphEdge,
  GraphNode,
  Medium,
  NodeId,
  SimGraph,
} from './graph';
import { ALARM_ROOM, annunciatorDisplays } from './sources/alarms';
import { stateAdapter } from './state-adapters';

/**
 * A node's page as data (mission 138, plan section 4): its seven
 * sections, each a pure function of the graph, the node and a fresh
 * world. A blank is a finding, not an error. Pure.
 */

export interface NodePageInput {
  world: World;
  /** The look catalogue's entries (126), for objects bound to a node. */
  catalogue?: readonly LookEntry[];
  makerOf?: (kind: string) => string | undefined;
}

/** A room audit row's link (129). */
export const auditRowLink = (room: string, ref: string) =>
  `${auditLink(room)}#${encodeURIComponent(`row-${ref}`)}`;

/** A node page's route. */
export const nodeLink = (id: NodeId, anchor?: string) =>
  `bench.html?bench=sim-node&node=${encodeURIComponent(id)}${anchor ? `#${encodeURIComponent(anchor)}` : ''}`;

export interface PortRow {
  port: string | null;
  direction: 'in' | 'out';
  medium: Medium | null;
  edge: GraphEdge['kind'];
  far: NodeId;
  farName: string;
  farPort: string | null;
  via: string;
  run?: ConnectorRun;
}

export interface RunRow {
  run: ConnectorRun;
  anchor: string;
  /** The active end on the other side, or the boundary's name. */
  far: { node?: NodeId; name: string; end: string };
  /** Across a boundary: the nodes the join reaches on the other side. */
  across: NodeId[];
}

export interface Representation {
  room: string;
  ref: string;
  name: string;
  why: string;
  link: string;
}

export interface NodePage {
  id: NodeId;
  node: GraphNode;
  what: {
    domain: Medium[];
    kind: string;
    tier: string;
    room: string;
    roomName: string;
    tag?: string;
    name: string;
    description?: string;
    maker?: string;
    parent?: NodeId;
    members: NodeId[];
    address?: string;
  };
  connect: { ports: PortRow[]; runs: RunRow[] };
  state: {
    adapter?: string;
    fields: {
      name: string;
      path: string;
      type: string;
      unit?: string;
      values?: readonly string[];
      saved: boolean;
      normal?: string;
      value: unknown;
    }[];
  };
  change: {
    drivers: (Driver & { viaText: string })[];
    faults: readonly string[];
    events: GameEvent[];
    eventSource?: string;
    note?: string;
    declared: boolean;
  };
  related: {
    upstream: PortRow[];
    downstream: PortRow[];
    controls: { room: string; ref: string; label: string; via: string }[];
    parentControls: { room: string; ref: string; label: string; via: string }[];
    readings: { room: string; ref: string; label: string; via: string }[];
    copies: { other: NodeId; role: 'board' | 'copy' }[];
    alarms: {
      alarm: NodeId;
      both: boolean;
      boards: { room: string; ref: string }[];
    }[];
    alarmsDeclared: boolean;
  };
  world: {
    home?: string;
    shownIn: string[];
    unknownIn: string[];
    touches: string[];
    representations: Representation[];
    canSee: FlagValue;
    canAct: boolean;
  };
  flags: Record<SimFlag, FlagValue>;
}

const nameOf = (g: SimGraph, id: NodeId) => g.nodes.get(id)?.name ?? id;

function portRows(g: SimGraph, id: NodeId, dir: 'down' | 'up'): PortRow[] {
  return neighbours(g, id, dir).map(({ node, edge }) => {
    const out = dir === 'down';
    return {
      port: out ? edge.fromPort : edge.toPort,
      direction: out ? 'out' : 'in',
      medium: edge.medium,
      edge: edge.kind,
      far: node,
      farName: nameOf(g, node),
      farPort: out ? edge.toPort : edge.fromPort,
      via: viaText(edge.via),
      ...(edge.run ? { run: edge.run } : {}),
    };
  });
}

/** The nodes a boundary's join reaches: across its `feeds` edges, then on along runs to active ends. */
export function acrossBoundary(g: SimGraph, boundary: NodeId): NodeId[] {
  const far = g.edges
    .filter(
      (e) => e.kind === 'feeds' && (e.from === boundary || e.to === boundary),
    )
    .map((e) => (e.from === boundary ? e.to : e.from));
  return far.flatMap((f) => {
    const n = g.nodes.get(f);
    if (!n?.boundary) return [f];
    const p = parseNodeId(f)!;
    return runsOf(p.room)
      .filter((r) => r.from.ref === localRef(f) || r.to.ref === localRef(f))
      .flatMap((r) => {
        const other = r.from.ref === localRef(f) ? r.to : r.from;
        return other.end === 'active' ? [`${p.room}/${other.ref}`] : [];
      });
  });
}

function runRows(g: SimGraph, n: GraphNode): RunRow[] {
  const ref = localRef(n.id);
  return runsOf(n.room)
    .filter((r) => r.from.ref === ref || r.to.ref === ref)
    .map((r) => {
      const other = r.from.ref === ref ? r.to : r.from;
      const farId = `${n.room}/${other.ref}`;
      return {
        run: r,
        anchor: runAnchor(r),
        far: {
          ...(other.end === 'active' ? { node: farId } : {}),
          name: nameOf(g, farId),
          end: other.end,
        },
        across: other.end === 'boundary' ? acrossBoundary(g, farId) : [],
      };
    });
}

export function nodePage(
  g: SimGraph,
  id: NodeId,
  input: NodePageInput,
): NodePage | undefined {
  const node = g.nodes.get(id);
  if (!node) return undefined;
  const { world } = input;
  const upstream = portRows(g, id, 'up');
  const downstream = portRows(g, id, 'down');
  const runs = runRows(g, node);
  const domain = [
    ...new Set(
      [
        ...upstream,
        ...downstream,
        ...runs.map((r) => ({ medium: r.run.medium })),
      ]
        .map((p) => p.medium)
        .filter((m): m is Medium => !!m),
    ),
  ];
  const rel = relationsOf(g, id);
  const parentRel = node.parent ? relationsOf(g, node.parent) : undefined;
  const ctl = (c: (typeof rel.controls)[number]) => ({
    room: c.control.room,
    ref: c.control.ref,
    label: c.control.label,
    via: viaText(c.via),
  });
  // Representations: bound objects, readings, controls, copies, boards.
  const reps: Representation[] = [];
  const add = (room: string, ref: string, name: string, why: string) => {
    if (!reps.some((r) => r.room === room && r.ref === ref && r.why === why))
      reps.push({ room, ref, name, why, link: auditRowLink(room, ref) });
  };
  const boundTo = (target: GraphNode, why: string) =>
    (input.catalogue ?? [])
      .filter(
        (e) =>
          e.room === target.room &&
          (e.model === localRef(target.id) ||
            (!!target.tag &&
              e.tag?.toLowerCase() === target.tag.toLowerCase())),
      )
      .forEach((e) => add(e.room, e.ref, e.title, why));
  boundTo(node, 'bound directly');
  const parent = node.parent ? g.nodes.get(node.parent) : undefined;
  if (parent) boundTo(parent, `through its parent, ${parent.name}`);
  for (const r of rel.readings)
    add(
      r.reading.room,
      r.reading.ref,
      `${r.reading.label}`,
      'a reading shows it',
    );
  for (const c of rel.controls)
    add(
      c.control.room,
      c.control.ref.replace(/\/[^/]*$/, ''),
      c.control.label,
      'a control works it',
    );
  for (const c of parentRel?.controls ?? [])
    add(
      c.control.room,
      c.control.ref.replace(/\/[^/]*$/, ''),
      c.control.label,
      'a control on its parent works it',
    );
  for (const c of rel.copies) {
    const other = c.board === id ? c.copy : c.board;
    const o = g.nodes.get(other);
    if (o)
      boundTo(
        o,
        c.board === id ? 'a copy of this board' : 'the board this copies',
      );
  }
  const displays = annunciatorDisplays();
  if (node.sort === 'alarm')
    for (const d of displays)
      add(
        d.room,
        d.ref,
        d.name,
        'a window on this annunciator (a shared code)',
      );
  // Alarms it raises, and where they show.
  const raised = downstream
    .filter((p) => p.edge === 'raises')
    .map((p) => p.far);
  const alarms = (node.sort === 'alarm' ? [id] : raised).map((a) => {
    const boards = displays.map((d) => ({ room: d.room, ref: d.ref }));
    return {
      alarm: a,
      boards,
      both:
        boards.some((b) => b.room === ALARM_ROOM) &&
        boards.some((b) => b.room === 'bridge'),
    };
  });
  const home = node.room === 'world' ? undefined : node.room;
  const shownIn = [...new Set(reps.map((r) => r.room))];
  const candidates = [
    ...new Set([
      ...(home ? [home] : []),
      ALARM_ROOM,
      'bridge',
      ...rel.copies.map(
        (c) => parseNodeId(c.board === id ? c.copy : c.board)!.room,
      ),
    ]),
  ];
  const unknownIn = candidates.filter(
    (r) => !shownIn.includes(r) && !fullyCovered(roomCoverage(r)),
  );
  const touches = [
    ...new Set(
      [...upstream, ...downstream]
        .map((p) => g.nodes.get(p.far)?.room)
        .filter((r): r is string => !!r && r !== 'world'),
    ),
  ];
  const adapter = stateAdapter(node, world);
  const values = adapter?.read(world) ?? {};
  const change = CHANGES[id];
  const tag = node.tag;
  const entry = (input.catalogue ?? []).find(
    (e) =>
      e.room === node.room &&
      (e.model === localRef(id) ||
        (!!tag && e.tag?.toLowerCase() === tag.toLowerCase())),
  );
  const maker = entry ? input.makerOf?.(entry.kind) : undefined;
  let description: string | undefined;
  try {
    description = tag ? componentDescription(tag) || undefined : undefined;
  } catch {
    description = undefined;
  }
  const members = g.edges
    .filter(
      (e) => e.kind === 'contains' && e.from === id && e.fromPort === null,
    )
    .map((e) => e.to);
  const controls =
    rel.controls.filter((c) => c.target !== 'unresolved').length +
    (parentRel?.controls.length ?? 0);
  const dupTag =
    !!tag &&
    [...g.nodes.values()].filter(
      (n) => n.tag?.toLowerCase() === tag.toLowerCase(),
    ).length > 1;
  const flags = simFlags({
    node,
    hasState: !!adapter,
    // A run out to (or in from) a room boundary counts: it carries on across the join.
    upstream:
      upstream.length +
      runs.filter(
        (r) => r.run.to.ref === localRef(id) && r.far.end === 'boundary',
      ).length,
    downstream:
      downstream.length +
      runs.filter(
        (r) => r.run.from.ref === localRef(id) && r.far.end === 'boundary',
      ).length,
    controls,
    described: roomCoverage(node.room).descriptors === 'described',
    representations: reps.length,
    unknownIn,
    alarms: alarms.map((a) => a.both),
    alarmsDeclared: node.sort === 'alarm' || raised.length > 0,
    tagExpected:
      (node.sort === 'node' && isKindId(node.kind)) ||
      node.kind === 'room-feeder',
    duplicateTag: dupTag,
  });
  return {
    id,
    node,
    what: {
      domain,
      kind: node.kind,
      tier: node.tier,
      room: node.room,
      roomName: ROOM_NAMES[node.room] ?? node.room,
      ...(tag ? { tag } : {}),
      name: node.name,
      ...(description ? { description } : {}),
      ...(maker ? { maker } : {}),
      ...(node.parent ? { parent: node.parent } : {}),
      members,
      ...(node.address ? { address: node.address } : {}),
    },
    connect: {
      ports: [...upstream, ...downstream],
      runs,
    },
    state: {
      ...(adapter ? { adapter: adapter.name } : {}),
      fields: (adapter?.fields ?? []).map((f) => ({
        ...f,
        value: values[f.name],
      })),
    },
    change: {
      drivers: (change?.drivers ?? []).map((d) => ({
        ...d,
        viaText: viaText(d.via),
      })),
      faults: change?.faults ?? [],
      events: change ? sampleEvents(change, world) : [],
      ...(change?.events ? { eventSource: change.events.source } : {}),
      ...(change?.events?.note ? { note: change.events.note } : {}),
      declared: !!change,
    },
    related: {
      upstream,
      downstream,
      controls: rel.controls.map(ctl),
      parentControls: (parentRel?.controls ?? []).map(ctl),
      readings: rel.readings.map((r) => ({
        room: r.reading.room,
        ref: r.reading.ref,
        label: r.reading.label,
        via: viaText(r.via),
      })),
      copies: rel.copies.map((c) =>
        c.board === id
          ? { other: c.copy, role: 'copy' as const }
          : { other: c.board, role: 'board' as const },
      ),
      alarms,
      alarmsDeclared: node.sort === 'alarm' || raised.length > 0,
    },
    world: {
      ...(home ? { home } : {}),
      shownIn,
      unknownIn,
      touches,
      representations: reps,
      canSee: reps.length ? 'yes' : unknownIn.length ? 'unknown' : 'no',
      canAct: controls > 0,
    },
    flags,
  };
}

/** Every node with a page, for the Simulation list: its rooms (home, touches) and domain, cheaply. */
export function simList(g: SimGraph) {
  return [...g.nodes.values()]
    .filter((n) => n.tier !== 'connector')
    .map((n) => {
      const near = [
        ...neighbours(g, n.id, 'up'),
        ...neighbours(g, n.id, 'down'),
      ];
      const media = [
        ...new Set([
          ...near.map((x) => x.edge.medium),
          ...runsOf(n.room)
            .filter(
              (r) =>
                r.from.ref === localRef(n.id) || r.to.ref === localRef(n.id),
            )
            .map((r) => r.medium),
        ]),
      ].filter((m): m is Medium => !!m);
      return {
        node: n,
        media,
        touches: [
          ...new Set(
            near
              .map((x) => g.nodes.get(x.node)?.room)
              .filter((r): r is string => !!r),
          ),
        ],
      };
    });
}
