import { resolveLookRef, refOfOwner } from './look-ref';
import type { LookOwner } from './look-ref';
import type { LookBox } from './look-camera';
import type { Lookable } from './kind-catalogue';
import type { ObjectClass } from './object-class';

/**
 * The look audit (mission 127, `doc/plans/127-everything-lookable.md`):
 * from a built room's inventory (`views/look-audit-scene.ts` scans it),
 * every look target with its record, and the findings: what is drawn but
 * unlabelled, what data names but the scene cannot reach, tags answering
 * to two things, and fronts a look cannot see. Shared with mission 129's
 * room audit, which reads the same records. Pure.
 */

/** A marked owner as scanned: 125's `LookOwner`, with what the audit needs of it. */
export interface ScannedOwner extends LookOwner {
  /** Marked as an architectural component (a sign, a fitting, a door). */
  architectural?: boolean;
  /** Its world box and everything under it, metres; null when it draws nothing. */
  box: LookBox | null;
}

/** A mesh with no marked owner, as scanned. */
export interface LooseMesh {
  /** Its nearest named ancestor's name (or its own), with the names above it: `Plant room / Pipe rack`. */
  under: string;
  /** Its largest extent, metres. */
  size: number;
  /** Its box's volume, cubic metres. */
  volume: number;
}

/** A decorative mark over something worded (a sign hidden as decoration). */
export interface HiddenSign {
  name: string;
}

/** What a look from the front found for a target, from the scene. */
export interface FrontLook {
  /** Rays of nine that reach it from the chosen front pose. */
  seen: number;
  /** Its front faces something solid within 0.3 m. */
  wallAhead: boolean;
  /** No pose a walker could stand at: placed in the free camera. */
  noclip: boolean;
}

/** One entry the data expects in the room: the catalogue's (126) or the register's. */
export interface ExpectedEntry {
  ref: string;
  title: string;
  kind?: string;
  look: Lookable;
  source: 'catalogue' | 'register';
}

/** A control the descriptors (131) name in this room. */
export interface ExpectedControl {
  ref: string;
  label: string;
}

/** Everything the scanner found in one built room. */
export interface RoomInventory {
  room: string;
  /** The room offers look links (125's hook); false, it was scanned after a settle. */
  hook: boolean;
  owners: readonly ScannedOwner[];
  loose: readonly LooseMesh[];
  hiddenSigns: readonly HiddenSign[];
  /** Each target's front look, by its ref; absent when not looked at. */
  fronts: Readonly<Record<string, FrontLook>>;
  expected: readonly ExpectedEntry[];
  controls: readonly ExpectedControl[];
  /** How long the scan took, ms, and the build before it. */
  timing?: { build: number; scan: number };
}

/** A target's class: the shared classification's, else what its marks say. */
export type TargetClass = ObjectClass | 'unclassified';

/** One record per look target: shared with 129's room audit. */
export interface TargetRecord {
  ref: string;
  tag?: string;
  name?: string;
  /** Its model binding as a ref (`node:…`, `fitting:…`, `link:…`). */
  model?: string;
  /** Its catalogue entry's asset id. */
  assetId?: string;
  kind?: string;
  class: TargetClass;
  /** Its constituent owners (125 combines a pipe and its markings). */
  owners: number;
  /** Its named parts' labels. */
  parts: string[];
  /** Its catalogue status, or `absent` when no catalogue entry names it. */
  catalogue: Lookable | 'absent';
  front?: FrontLook;
  /** Its size, metres (largest extent). */
  size: number;
  findings: TargetFinding[];
  /** Why a finding of it is accepted, from `KNOWN_UNLOOKABLE`. */
  exception?: string;
}

export type TargetFinding = 'bad-front' | 'duplicate-tag' | 'duplicate-name';

/** Loose geometry grouped under its nearest named ancestor. */
export interface UnlabelledGroup {
  under: string;
  meshes: number;
  volume: number;
  size: number;
  exception?: string;
}

export interface UnreachableEntry extends ExpectedEntry {
  reason: string;
  exception?: string;
}

export interface RoomAudit {
  room: string;
  hook: boolean;
  targets: TargetRecord[];
  unlabelled: UnlabelledGroup[];
  /** Expected entries that do not resolve. */
  unreachable: UnreachableEntry[];
  /** Unverified catalogue entries that do not resolve: reported apart. */
  unverified: UnreachableEntry[];
  /** Two separate things answering to one tag: an error. */
  duplicateTags: { tag: string; pieces: number; exception?: string }[];
  /** Separate things sharing one name: listed, resolved by `#n`. */
  duplicateNames: { name: string; count: number }[];
  badFronts: string[];
  hiddenSigns: string[];
  /** 131's controls whose refs do not resolve here (127 marks them). */
  unmarkedControls: { ref: string; reason: string }[];
  counts: AuditCounts;
  /** Findings not excused by `KNOWN_UNLOOKABLE`: the run fails on these. */
  failing: number;
  timing?: { build: number; scan: number };
}

export interface AuditCounts {
  targets: number;
  architectural: number;
  unlabelled: number;
  unreachable: number;
  unverified: number;
  duplicateTags: number;
  duplicateNames: number;
  badFronts: number;
  hiddenSigns: number;
  unmarkedControls: number;
}

/** Loose geometry smaller than this across (metres) is not reported: a screw, not a boiler. */
export const LOOSE_CUTOFF = 0.05;
/** A front seeing fewer rays than this (of nine) is a bad front: under half. */
export const FRONT_SEEN_MIN = 5;
/** Owners sharing a tag further apart than this (metres) are two things, not one in pieces. */
export const DUPLICATE_GAP = 1;

/**
 * Findings accepted for now, each with its reason and flagged in `TODO.md`
 * (the brief): by room, the finding's subject (a ref, a tag, or the
 * unlabelled group's `under`). Empty: mission 132 brings the rooms up to
 * code, and fills this only where a finding is to stay.
 */
export const KNOWN_UNLOOKABLE: Readonly<
  Record<string, readonly { subject: string; reason: string }[]>
> = {};

const known = (room: string, subject: string) =>
  KNOWN_UNLOOKABLE[room]?.find(
    (k) => k.subject.toLowerCase() === subject.toLowerCase(),
  )?.reason;

const modelRefOf = (o: LookOwner) => {
  if (!o.model) return undefined;
  if ('node' in o.model) return `node:${o.model.node}`;
  if ('fitting' in o.model) return `fitting:${o.model.fitting}`;
  return `link:${o.model.link}`;
};

const groupKey = (o: LookOwner, i: number) =>
  o.tag
    ? `tag:${o.tag.toLowerCase()}`
    : modelRefOf(o)
      ? modelRefOf(o)!.toLowerCase()
      : `#${i}`;

/**
 * The look targets of a room's owners, in scene order: 125's grouping
 * (`look-ref.ts`), every owner that is not a part, grouped by tag first and
 * by model binding where it has no tag; a named owner inside another of
 * the same name is a piece of it (dev39's mimics name their pieces alike).
 */
export function lookTargets(
  owners: readonly LookOwner[],
): { ref: string; members: number[] }[] {
  const groups = new Map<string, number[]>();
  const order: string[] = [];
  owners.forEach((o, i) => {
    if (o.part) return;
    let key = groupKey(o, i);
    if (key.startsWith('#') && o.name) {
      const same = o.ancestors.find(
        (a) =>
          !owners[a].part &&
          owners[a].name?.toLowerCase() === o.name!.toLowerCase(),
      );
      if (same !== undefined) key = groupKey(owners[same], same);
    }
    const list = groups.get(key);
    if (list) list.push(i);
    else {
      groups.set(key, [i]);
      order.push(key);
    }
  });
  return order.map((key) => {
    const members = groups.get(key)!;
    return { ref: refOfOwner(owners[members[0]]), members };
  });
}

const unionBox = (boxes: readonly (LookBox | null)[]): LookBox | null => {
  let out: LookBox | null = null;
  for (const b of boxes) {
    if (!b) continue;
    out = out
      ? {
          min: {
            x: Math.min(out.min.x, b.min.x),
            y: Math.min(out.min.y, b.min.y),
            z: Math.min(out.min.z, b.min.z),
          },
          max: {
            x: Math.max(out.max.x, b.max.x),
            y: Math.max(out.max.y, b.max.y),
            z: Math.max(out.max.z, b.max.z),
          },
        }
      : b;
  }
  return out;
};

const sizeOf = (b: LookBox | null) =>
  b ? Math.max(b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z) : 0;

/** The gap between two boxes, metres (0 when they touch or overlap). */
export function boxGap(a: LookBox, b: LookBox) {
  const d = (lo1: number, hi1: number, lo2: number, hi2: number) =>
    Math.max(0, lo2 - hi1, lo1 - hi2);
  return Math.hypot(
    d(a.min.x, a.max.x, b.min.x, b.max.x),
    d(a.min.y, a.max.y, b.min.y, b.max.y),
    d(a.min.z, a.max.z, b.min.z, b.max.z),
  );
}

/**
 * Whether owners sharing one tag are two separate things: bound to
 * different model objects, or apart by more than `DUPLICATE_GAP` with no
 * piece bridging them (clustered by their boxes). A pipe and its markings
 * share a binding and touch, so they are one.
 */
export function splitsApart(owners: readonly ScannedOwner[]): boolean {
  const bindings = new Set(
    owners.map(modelRefOf).filter((r): r is string => r !== undefined),
  );
  if (bindings.size > 1) return true;
  // The outermost of them only: a piece inside another is part of it.
  const boxes = owners.map((o) => o.box).filter((b): b is LookBox => !!b);
  if (boxes.length < 2) return false;
  const cluster = new Set([0]);
  let grew = true;
  while (grew) {
    grew = false;
    for (let i = 0; i < boxes.length; i++)
      if (
        !cluster.has(i) &&
        [...cluster].some((j) => boxGap(boxes[i], boxes[j]) <= DUPLICATE_GAP)
      ) {
        cluster.add(i);
        grew = true;
      }
  }
  return cluster.size < boxes.length;
}

/** Group loose meshes under their nearest named ancestor, largest first, the tiny left out. */
export function unlabelledGroups(
  room: string,
  loose: readonly LooseMesh[],
): UnlabelledGroup[] {
  const groups = new Map<string, UnlabelledGroup>();
  for (const m of loose) {
    if (m.size < LOOSE_CUTOFF) continue;
    const g = groups.get(m.under) ?? {
      under: m.under,
      meshes: 0,
      volume: 0,
      size: 0,
    };
    g.meshes++;
    g.volume += m.volume;
    g.size = Math.max(g.size, m.size);
    groups.set(m.under, g);
  }
  return [...groups.values()]
    .map((g) => {
      const exception = known(room, g.under);
      return exception ? { ...g, exception } : g;
    })
    .sort((a, b) => b.volume - a.volume || a.under.localeCompare(b.under));
}

/** The class of a target: architectural by its mark, else its kind's, else bound means plant. */
function classOf(
  owners: readonly ScannedOwner[],
  kindClass: TargetClass | undefined,
): TargetClass {
  if (owners.some((o) => o.architectural)) return 'architectural';
  if (kindClass) return kindClass;
  if (owners.some((o) => o.model)) return 'plant';
  return 'unclassified';
}

/** The audit of one room, from its inventory; `classOfKind` is the shared classification's. */
export function auditRoom(
  inv: RoomInventory,
  classOfKind: (kind: string) => TargetClass | undefined = () => undefined,
): RoomAudit {
  const { room, owners } = inv;
  const targets = lookTargets(owners);
  // Which catalogue entry names which target, by resolving each entry once.
  const entryOf = new Map<number, ExpectedEntry>();
  const unreachable: UnreachableEntry[] = [];
  const unverified: UnreachableEntry[] = [];
  const seenRefs = new Set<string>();
  for (const e of inv.expected) {
    if (e.look === 'none') continue;
    const key = e.ref.toLowerCase();
    if (seenRefs.has(key)) continue;
    seenRefs.add(key);
    const r = resolveLookRef(owners, e.ref, room);
    if (r.ok) {
      const first = r.target.members[0];
      if (!entryOf.has(first)) entryOf.set(first, e);
      continue;
    }
    // A repeated name is reachable by `#n`: listed among duplicates, not lost.
    if (r.matches?.length && /matches \d+ objects/.test(r.reason)) {
      const t = targets.find((t) =>
        t.members.some(
          (m) => owners[m].name?.toLowerCase() === e.title.toLowerCase(),
        ),
      );
      if (t && !entryOf.has(t.members[0])) entryOf.set(t.members[0], e);
      continue;
    }
    const exception = known(room, e.ref);
    const row: UnreachableEntry = {
      ...e,
      reason: r.reason,
      ...(exception ? { exception } : {}),
    };
    if (e.look === 'unverified') unverified.push(row);
    else unreachable.push(row);
  }

  const duplicateTags: RoomAudit['duplicateTags'] = [];
  const nameCount = new Map<string, { name: string; count: number }>();
  const records: TargetRecord[] = targets.map((t) => {
    const members = t.members.map((i) => owners[i]);
    const first = members[0];
    const entry = entryOf.get(t.members[0]);
    const memberSet = new Set(t.members);
    const parts = owners
      .filter((o) => o.part && o.ancestors.some((a) => memberSet.has(a)))
      .map((o) => o.part!.label);
    const findings: TargetFinding[] = [];
    if (first.tag && members.length > 1 && splitsApart(members)) {
      findings.push('duplicate-tag');
      const exception = known(room, first.tag);
      duplicateTags.push({
        tag: first.tag,
        pieces: members.length,
        ...(exception ? { exception } : {}),
      });
    }
    if (!first.tag && !modelRefOf(first) && first.name) {
      const k = first.name.toLowerCase();
      const n = nameCount.get(k) ?? { name: first.name, count: 0 };
      n.count++;
      nameCount.set(k, n);
    }
    const front = inv.fronts[t.ref];
    // A pipe run (a link) has no front to face a wall: only its rays count.
    const facesWall = front?.wallAhead && !t.ref.startsWith('link:');
    if (front && (front.seen < FRONT_SEEN_MIN || facesWall))
      findings.push('bad-front');
    const exception = known(room, t.ref);
    const model = modelRefOf(first);
    const kindClass = entry?.kind ? classOfKind(entry.kind) : undefined;
    return {
      ref: t.ref,
      ...(first.tag ? { tag: first.tag } : {}),
      ...(members.find((m) => m.name)?.name
        ? { name: members.find((m) => m.name)!.name }
        : {}),
      ...(model ? { model } : {}),
      ...(entry?.kind ? { kind: entry.kind } : {}),
      class: classOf(members, kindClass),
      owners: members.length,
      parts: [...new Set(parts)],
      catalogue: entry?.look ?? 'absent',
      ...(front ? { front } : {}),
      size: sizeOf(unionBox(members.map((m) => m.box))),
      findings,
      ...(exception ? { exception } : {}),
    };
  });
  const duplicateNames = [...nameCount.values()].filter((n) => n.count > 1);
  for (const r of records)
    if (
      r.name &&
      !r.tag &&
      !r.model &&
      duplicateNames.some((d) => d.name.toLowerCase() === r.name!.toLowerCase())
    )
      r.findings.push('duplicate-name');

  const unmarkedControls = inv.controls.flatMap((c) => {
    const r = resolveLookRef(owners, c.ref, room);
    return r.ok && r.target.part
      ? []
      : [{ ref: c.ref, reason: r.ok ? `${c.ref} is not a part` : r.reason }];
  });
  const unlabelled = unlabelledGroups(room, inv.loose);
  const badFronts = records
    .filter((r) => r.findings.includes('bad-front'))
    .map((r) => r.ref);
  const counts: AuditCounts = {
    targets: records.length,
    architectural: records.filter((r) => r.class === 'architectural').length,
    unlabelled: unlabelled.length,
    unreachable: unreachable.length,
    unverified: unverified.length,
    duplicateTags: duplicateTags.length,
    duplicateNames: duplicateNames.length,
    badFronts: badFronts.length,
    hiddenSigns: inv.hiddenSigns.length,
    unmarkedControls: unmarkedControls.length,
  };
  const failing =
    unlabelled.filter((g) => !g.exception).length +
    unreachable.filter((u) => !u.exception).length +
    duplicateTags.filter((d) => !d.exception).length;
  return {
    room,
    hook: inv.hook,
    targets: records,
    unlabelled,
    unreachable,
    unverified,
    duplicateTags,
    duplicateNames,
    badFronts,
    hiddenSigns: inv.hiddenSigns.map((h) => h.name),
    unmarkedControls,
    counts,
    failing,
    ...(inv.timing ? { timing: inv.timing } : {}),
  };
}

/** The headline of a room's audit, for the summary and the committed report. */
export interface RoomSummary {
  room: string;
  hook: boolean;
  counts: AuditCounts;
  failing: number;
  /** The unlabelled groups' total volume, cubic metres. */
  unlabelledVolume: number;
  /** Why it could not be audited (it failed to build, or timed out). */
  error?: string;
}

export const summaryOf = (a: RoomAudit): RoomSummary => ({
  room: a.room,
  hook: a.hook,
  counts: a.counts,
  failing: a.failing,
  unlabelledVolume:
    Math.round(a.unlabelled.reduce((s, g) => s + g.volume, 0) * 100) / 100,
});

/** The totals over rooms' summaries. */
export function totalsOf(rooms: readonly RoomSummary[]) {
  const sum = (f: (c: AuditCounts) => number) =>
    rooms.reduce((s, r) => s + f(r.counts), 0);
  return {
    rooms: rooms.length,
    errors: rooms.filter((r) => r.error).length,
    passing: rooms.filter((r) => !r.error && r.failing === 0).length,
    targets: sum((c) => c.targets),
    unlabelled: sum((c) => c.unlabelled),
    unreachable: sum((c) => c.unreachable),
    unverified: sum((c) => c.unverified),
    duplicateTags: sum((c) => c.duplicateTags),
    badFronts: sum((c) => c.badFronts),
  };
}
