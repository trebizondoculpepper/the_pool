import type { PlumbEdge } from '../../../game/plant/plumbing-expansion';
import { SCHEMATICS } from '../../../game/plant/schematics';
import type { ObjectDescriptor } from '../../../game/descriptors/descriptor';
import { readAll } from '../../../game/descriptors/descriptor';
import type { World } from '../../../game/world';
import type { RoomAudit, TargetRecord, UnlabelledGroup } from './look-audit';
import type { LookEntry } from './look-catalogue';
import { roomNetwork } from './world-in-model';

/**
 * The room audit (mission 129, `doc/plans/129-room-audit.md`): one row per
 * look target of a built room, read from 127's look audit of it (the one
 * scanner and its records, so the two audits never disagree), with what
 * 129 adds: each row's model connections through its ports (`drawn`,
 * `model only` or `boundary`), what controls it and what it controls
 * (131's control descriptors' `targets`), which boards it copies or is
 * copied by, what it shows now (its descriptor's readings, by the no-peeking
 * rule), and its flags. A blank cell is the sign that something is not
 * yet described (the owner, 2026-11-02). Pure.
 */

/** How a connection is laid: a run drawn in the room, a link in the model only, or one leaving the room. */
export type ConnectionLabel = 'drawn' | 'model only' | 'boundary';

export interface Connection {
  /** The link it is made through. */
  link: string;
  medium: PlumbEdge['medium'];
  /** The neighbour's model ref: `node:…` or `fitting:…`. */
  neighbour: string;
  /** The neighbour's name in the schematic, else its id. */
  name: string;
  label: ConnectionLabel;
}

/** A room's enhanced network as the audit reads it: its nodes, its links, and each link's fittings in order. */
export interface AuditNetwork {
  nodes: readonly { id: string; kind: string; name?: string }[];
  links: readonly PlumbEdge[];
  /** Each link's fittings, from its source to its target. */
  along: ReadonlyMap<string, readonly string[]>;
}

/** The room's enhanced network (`world-in-model.ts`), with its schematic's names; none for a room without one. */
export function auditNetwork(room: string): AuditNetwork | undefined {
  const built = roomNetwork(room);
  if (!built) return undefined;
  const names = new Map(
    (SCHEMATICS[room]?.nodes ?? []).map((n) => [n.id, n.name]),
  );
  return {
    nodes: built.expansion.nodes.map((n) => ({
      id: n.id,
      kind: n.kind,
      ...(names.has(n.id) ? { name: names.get(n.id) } : {}),
    })),
    links: built.links,
    along: alongOf(built.expansion),
  };
}

/** Each link's fittings in order: the plumber's `along`, with any fitting it lists on no link (a shared port's) put on its own. */
function alongOf(
  x: NonNullable<ReturnType<typeof roomNetwork>>['expansion'],
): Map<string, string[]> {
  const out = new Map([...x.along].map(([k, fs]) => [k, fs.map((f) => f.id)]));
  const placed = new Set([...out.values()].flat());
  for (const f of x.fittings) {
    if (placed.has(f.id) || !f.edge) continue;
    const list = out.get(f.edge) ?? [];
    if (f.end === 'source') list.unshift(f.id);
    else list.push(f.id);
    out.set(f.edge, list);
  }
  return out;
}

/** What of the network the room's scene holds: model refs of its rows (`node:…`, `fitting:…`, `link:…`). */
export type Present = ReadonlySet<string>;

/**
 * A model object's connections: along each link it is on, its neighbour
 * on either side (the next fitting, or the link's other end). `boundary`
 * when the neighbour is a boundary node or is not in the room's scene (it
 * is in another room, or beyond it), else `drawn` when the link is drawn
 * in the room, else `model only` (a signal, a link not laid).
 */
export function connectionsOf(
  model: string,
  net: AuditNetwork,
  present: Present,
): Connection[] {
  const [sort, id] = [
    model.slice(0, model.indexOf(':')),
    model.slice(model.indexOf(':') + 1),
  ];
  if (sort !== 'node' && sort !== 'fitting') return [];
  const kinds = new Map(net.nodes.map((n) => [n.id, n]));
  const out: Connection[] = [];
  for (const l of net.links) {
    const seq: string[] = [
      `node:${l.sourceId}`,
      ...(net.along.get(l.id) ?? []).map((f) => `fitting:${f}`),
      `node:${l.targetId}`,
    ];
    seq.forEach((ref, i) => {
      if (ref !== `${sort}:${id}`) return;
      for (const j of [i - 1, i + 1]) {
        const n = seq[j];
        if (!n) continue;
        const nid = n.slice(n.indexOf(':') + 1);
        const node = n.startsWith('node:') ? kinds.get(nid) : undefined;
        const label: ConnectionLabel =
          node?.kind === 'boundary' || !present.has(n)
            ? 'boundary'
            : present.has(`link:${l.id}`)
              ? 'drawn'
              : 'model only';
        out.push({
          link: l.id,
          medium: l.medium,
          neighbour: n,
          name: node?.name ?? nid,
          label,
        });
      }
    });
  }
  return out;
}

/** A control acting on a row, or a row's control and what it works. */
export interface ControlLink {
  /** The control's id: `PL3-CAB1/power`. */
  control: string;
  label: string;
  /** The object it belongs to, and its room. */
  object: string;
  room: string;
  /** Only on its plant room's own panel. */
  local?: boolean;
  /** What it works (for a row's own controls). */
  targets?: readonly string[];
}

const lower = (s: string) => s.toLowerCase();

/** Whether a descriptor's target names a row: by its ref or tag anywhere, by its model ref in its own room. */
const names = (
  target: string,
  row: Pick<TargetRecord, 'ref' | 'tag' | 'model'>,
  room: string,
  targetRoom: string,
) =>
  lower(target) === lower(row.ref) ||
  (!!row.tag && lower(target) === lower(row.tag)) ||
  (!!row.model && targetRoom === room && target === row.model);

/** The controls, in every described room, whose targets name this row. */
export function controlledBy(
  row: Pick<TargetRecord, 'ref' | 'tag' | 'model'>,
  room: string,
  descriptors: readonly ObjectDescriptor[],
): ControlLink[] {
  return descriptors.flatMap((d) =>
    d.controls
      .filter((c) => c.targets.some((t) => names(t, row, room, d.room)))
      .map((c) => ({
        control: c.ref,
        label: c.label,
        object: d.ref,
        room: d.room,
        ...(c.local ? { local: true } : {}),
      })),
  );
}

/** A row's own controls that work something other than itself, with what. */
export function controlsOf(
  row: Pick<TargetRecord, 'ref' | 'tag' | 'model'>,
  room: string,
  descriptors: readonly ObjectDescriptor[],
): ControlLink[] {
  const d = descriptors.find(
    (x) =>
      x.room === room &&
      (lower(x.ref) === lower(row.ref) ||
        (!!row.tag && lower(x.ref) === lower(row.tag))),
  );
  return (d?.controls ?? []).flatMap((c) => {
    const others = c.targets.filter((t) => !names(t, row, room, room));
    return others.length
      ? [
          {
            control: c.ref,
            label: c.label,
            object: d!.ref,
            room,
            ...(c.local ? { local: true } : {}),
            targets: others,
          },
        ]
      : [];
  });
}

/** A board and a copy of it in another room: both show one world state (one node each). */
export interface BoardCopy {
  copy: { room: string; node: string };
  board: { room: string; node: string };
}

/**
 * Copies whose kinds differ from their boards' (the control room's copy
 * is its own kind): the rest are found by kind.
 */
export const NAMED_COPIES: readonly BoardCopy[] = [
  {
    copy: { room: 'control_room', node: 'mimic-jacuzzi' },
    board: { room: 'plant_pool_03', node: 'mimic' },
  },
  {
    copy: { room: 'control_room', node: 'mimic-wet-fresh' },
    board: { room: 'wet_hall', node: 'mimic' },
  },
];

/** Every control-room board copy: the named ones, and each control-room mimic whose kind a plant room's board shares. */
export function boardCopies(
  schematics: Readonly<
    Record<
      string,
      { room: string; nodes: readonly { id: string; kind: string }[] }
    >
  > = SCHEMATICS,
): BoardCopy[] {
  const out = [...NAMED_COPIES];
  const cr = schematics.control_room;
  if (!cr) return out;
  for (const n of cr.nodes) {
    if (!n.kind.startsWith('mimic-')) continue;
    for (const s of Object.values(schematics)) {
      if (s.room === cr.room) continue;
      for (const b of s.nodes)
        if (
          b.kind === n.kind &&
          !out.some((c) => c.copy.node === n.id && c.board.room === s.room)
        )
          out.push({
            copy: { room: cr.room, node: n.id },
            board: { room: s.room, node: b.id },
          });
    }
  }
  return out;
}

/** The other end of each copy relation a row's model node is in. */
export function copiesOf(
  model: string | undefined,
  room: string,
  copies: readonly BoardCopy[],
): { mirrors: BoardCopy['board'][]; mirroredBy: BoardCopy['copy'][] } {
  const node = model?.startsWith('node:') ? model.slice(5) : undefined;
  if (!node) return { mirrors: [], mirroredBy: [] };
  return {
    mirrors: copies
      .filter((c) => c.copy.room === room && c.copy.node === node)
      .map((c) => c.board),
    mirroredBy: copies
      .filter((c) => c.board.room === room && c.board.node === node)
      .map((c) => c.copy),
  };
}

/** A reading's value in words. */
export const shownText = (
  v: string | number | boolean | readonly string[] | null,
): string =>
  v === null
    ? '—'
    : typeof v === 'boolean'
      ? v
        ? 'lit'
        : 'out'
      : Array.isArray(v)
        ? (v as readonly string[]).join(' · ')
        : typeof v === 'number'
          ? String(Math.round(v * 100) / 100)
          : String(v);

export type RoomFlag =
  | 'unnamed'
  | 'unbound'
  | 'orphan'
  | 'duplicate'
  | 'no-maker'
  | 'missing-control';

export const FLAG_WORDS: Record<RoomFlag, string> = {
  unnamed: 'unnamed: no tag or name',
  unbound: 'unbound: named, no model node',
  orphan: 'orphan: bound, no connections in the model',
  duplicate: 'duplicate: a tag or asset id shared',
  'no-maker': 'no maker recorded (a note)',
  'missing-control': 'a control wired to nothing',
};

export interface AuditRow {
  ref: string;
  tag?: string;
  name?: string;
  assetId?: string;
  kind?: string;
  kindWord?: string;
  maker?: string;
  class: TargetRecord['class'];
  model?: string;
  connections: Connection[];
  controlledBy: ControlLink[];
  controls: ControlLink[];
  mirrors: BoardCopy['board'][];
  mirroredBy: BoardCopy['copy'][];
  shows: { label: string; value: string }[];
  flags: RoomFlag[];
}

export interface RoomAuditInput {
  /** The room's enhanced network; none, nothing is flagged unbound or orphan. */
  network?: AuditNetwork;
  /** The room's catalogue entries (126), for asset ids, kinds and the no-maker note. */
  catalogue?: readonly LookEntry[];
  /** A kind's maker's name. */
  makerOf?: (kind: string) => string | undefined;
  /** Every described object (131), in every room. */
  descriptors?: readonly ObjectDescriptor[];
  copies?: readonly BoardCopy[];
  /** The world snapshot readings are read at; none, no readings. */
  world?: World;
}

export interface RoomAuditView {
  room: string;
  /** Named rows first (tagged, then named), then rows with neither. */
  rows: AuditRow[];
  /** Set decoration, listed apart, never flagged. */
  decorative: AuditRow[];
  /** Geometry no marked owner holds, by where it sits: each one unnamed. */
  unnamed: UnlabelledGroup[];
  /** Controls in data wired to nothing, and those the room's scene does not hold. */
  missingControls: { control: string; reason: string }[];
  counts: Record<RoomFlag, number> & { rows: number; flagged: number };
}

const ENGINEERING = new Set(['plant', 'non-plant', 'unclassified']);

/** The room audit's rows and flags, from 127's audit of the built room. */
export function roomAuditRows(
  audit: RoomAudit,
  input: RoomAuditInput = {},
): RoomAuditView {
  const { room } = audit;
  const descriptors = input.descriptors ?? [];
  const copies = input.copies ?? [];
  const net = input.network;
  const present: Present = new Set(
    audit.targets.flatMap((t) => (t.model ? [t.model] : [])),
  );
  const entryOf = (t: TargetRecord) =>
    input.catalogue?.find(
      (e) =>
        lower(e.ref) === lower(t.ref) ||
        (!!t.tag && !!e.tag && lower(e.tag) === lower(t.tag)),
    );
  const assetCount = new Map<string, number>();
  const all: AuditRow[] = audit.targets.map((t) => {
    const e = entryOf(t);
    const kind = t.kind ?? e?.kind;
    const desc = descriptors.find(
      (d) =>
        d.room === room &&
        (lower(d.ref) === lower(t.ref) ||
          (!!t.tag && lower(d.ref) === lower(t.tag))),
    );
    const shows =
      desc && input.world
        ? Object.entries(readAll(desc, input.world)).map(([k, v]) => ({
            label: desc.readings.find((r) => r.key === k)?.label ?? k,
            value: shownText(v),
          }))
        : [];
    const connections =
      net && t.model ? connectionsOf(t.model, net, present) : [];
    const flags: RoomFlag[] = [];
    const engineering = ENGINEERING.has(t.class);
    if (!t.tag && !t.name && engineering) flags.push('unnamed');
    if (net && engineering && !t.model && (t.tag || t.name))
      flags.push('unbound');
    if (
      net &&
      t.model?.startsWith('node:') &&
      !connections.length &&
      net.nodes.find((n) => `node:${n.id}` === t.model)?.kind !== 'boundary'
    )
      flags.push('orphan');
    if (t.findings.includes('duplicate-tag')) flags.push('duplicate');
    if (e?.findings.includes('no-maker')) flags.push('no-maker');
    if (e?.assetId)
      assetCount.set(e.assetId, (assetCount.get(e.assetId) ?? 0) + 1);
    const { mirrors, mirroredBy } = copiesOf(t.model, room, copies);
    const maker = kind ? input.makerOf?.(kind) : undefined;
    return {
      ref: t.ref,
      ...(t.tag ? { tag: t.tag } : {}),
      ...(t.name ? { name: t.name } : {}),
      ...(e?.assetId ? { assetId: e.assetId } : {}),
      ...(kind ? { kind } : {}),
      ...(e?.kindWord ? { kindWord: e.kindWord } : {}),
      ...(maker ? { maker } : {}),
      class: t.class,
      ...(t.model ? { model: t.model } : {}),
      connections,
      controlledBy: controlledBy(t, room, descriptors),
      controls: controlsOf(t, room, descriptors),
      mirrors,
      mirroredBy,
      shows,
      flags,
    };
  });
  for (const r of all)
    if (
      r.assetId &&
      (assetCount.get(r.assetId) ?? 0) > 1 &&
      !r.flags.includes('duplicate')
    )
      r.flags.push('duplicate');

  // A control in data wired to nothing: no target in any model or row.
  const known = new Set<string>();
  for (const d of descriptors) known.add(lower(d.ref));
  for (const r of all) {
    known.add(lower(r.ref));
    if (r.tag) known.add(lower(r.tag));
  }
  const modelled = (t: string, troom: string) => {
    if (!/^(node|fitting|link):/.test(t)) return known.has(lower(t));
    if (troom === room) return present.has(t) || inNetwork(t, net);
    return inNetwork(t, auditNetwork(troom));
  };
  const missingControls = [
    ...descriptors
      .filter((d) => d.room === room)
      .flatMap((d) =>
        d.controls.flatMap((c) =>
          c.targets
            .filter((t) => !modelled(t, d.room))
            .map((t) => ({
              control: c.ref,
              reason: `works ${t}, which nothing holds`,
            })),
        ),
      ),
    ...audit.unmarkedControls.map((u) => ({
      control: u.ref,
      reason: u.reason,
    })),
  ];
  for (const m of missingControls) {
    const owner = all.find((r) =>
      lower(m.control).startsWith(`${lower(r.tag ?? r.ref)}/`),
    );
    if (owner && !owner.flags.includes('missing-control'))
      owner.flags.push('missing-control');
  }

  const order = (r: AuditRow) => (r.tag ? 0 : r.name ? 1 : 2);
  const sorted = (rs: AuditRow[]) =>
    rs
      .map((r, i) => ({ r, i }))
      .sort(
        (a, b) =>
          order(a.r) - order(b.r) ||
          (order(a.r) < 2
            ? (a.r.tag ?? a.r.name ?? '').localeCompare(
                b.r.tag ?? b.r.name ?? '',
                undefined,
                { numeric: true },
              )
            : a.i - b.i),
      )
      .map((x) => x.r);
  const rows = sorted(all.filter((r) => r.class !== 'decorative'));
  const decorative = sorted(all.filter((r) => r.class === 'decorative'));
  const unnamed = audit.unlabelled;
  const flagCount = (f: RoomFlag) =>
    rows.filter((r) => r.flags.includes(f)).length +
    (f === 'unnamed' ? unnamed.length : 0);
  const counts = {
    rows: rows.length,
    flagged: rows.filter((r) => r.flags.length).length + unnamed.length,
    unnamed: flagCount('unnamed'),
    unbound: flagCount('unbound'),
    orphan: flagCount('orphan'),
    duplicate: flagCount('duplicate'),
    'no-maker': flagCount('no-maker'),
    'missing-control': missingControls.length,
  };
  return { room, rows, decorative, unnamed, missingControls, counts };
}

/** Whether a model ref names something in a network. */
function inNetwork(ref: string, net: AuditNetwork | undefined) {
  if (!net) return false;
  const id = ref.slice(ref.indexOf(':') + 1);
  if (ref.startsWith('node:')) return net.nodes.some((n) => n.id === id);
  if (ref.startsWith('link:')) return net.links.some((l) => l.id === id);
  return [...net.along.values()].some((fs) => fs.includes(id));
}
