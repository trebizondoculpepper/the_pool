import {
  EQUIPMENT_KINDS,
  isKindId,
  resolveKindAffordances,
} from '../../../../game/plant/equipment-kinds';
import type {
  EquipmentKind,
  KindAffordances,
} from '../../../../game/plant/equipment-kinds';
import { objectDescriptors } from '../../../../game/descriptors/registry';
import { kindFiles } from '../../../../game/plant/kind-files';
import type { KindFile } from '../../../../game/plant/kind-files';
import { ROOMS } from '../dev-room-links';
import { itemAuditLink } from '../item-audit';
import { kindCatalogue } from '../kind-catalogue';
import type { KindCatalogueInput, KindEntry } from '../kind-catalogue';
import { auditLink, lookCatalogue } from '../look-catalogue';
import type { LookEntry } from '../look-catalogue';
import { objectDetailLink } from '../object-detail';
import { AUDIT_MANIFESTS, CAPABILITIES } from './manifests';
import type { Capability, ManifestEntry, RoomManifest } from './manifests';
import { AUDIT_RULINGS, rulingOf } from './rulings';
import type { AuditRuling } from './rulings';

/**
 * Data-first, machine-readable audits (mission 167): one pure, typed audit
 * model for a room, a kind and the index, built from the registry, the
 * catalogue, the descriptors and the transitional manifests, with no
 * scene. The bench pages draw it and the `.json` exports serialise it
 * (`auditJson`), so the two always agree. Every claim says how it is
 * known; coverage says what the data can and cannot vouch for; a
 * proposal is never an approval. Pure.
 */

export const AUDIT_SCHEMA_VERSION = 1;

/**
 * How a claim is known: `declared` by the registry, catalogue or a
 * descriptor; `default` when nobody declared it and the value is the
 * registry's default (mission 168: never shown as declared); `observed` by an explicit scene scan; `proposed` by the
 * software's inference; `approved` by a recorded owner ruling.
 */
export type Evidence =
  | 'declared'
  | 'default'
  | 'observed'
  | 'proposed'
  | 'approved';

/**
 * What the data vouches for, per capability: `covered`, represented with
 * no known gap; `partial`, some evidence with known gaps; `none`, checked
 * and absent (only ever from a recorded check, never from an empty list);
 * `unknown`, not represented by the available data.
 */
export type Coverage = 'covered' | 'partial' | 'none' | 'unknown';

export type SignOff = 'not-started' | 'proposed' | 'signed-off';

export type Severity = 'error' | 'warning' | 'info';

export interface Claim<T> {
  value: T;
  evidence: Evidence;
  source: string;
}

export interface AuditLinks {
  html: string;
  json: string;
}

export interface AuditFinding {
  /** Stable: the same finding has the same id from run to run. */
  id: string;
  severity: Severity;
  room?: string;
  kind?: string;
  ref?: string;
  message: string;
  evidence: Evidence;
  source: string;
  next: string;
  links: string[];
}

export interface AuditObject {
  ref: string;
  title: string;
  kind: string;
  registered: boolean;
  tag?: string;
  assetId?: string;
  model?: string;
  parent?: string;
  /** Its kind's affordances, as the registry resolves them, or none when unregistered. */
  affordances?: Claim<KindAffordances>;
  /** Its descriptor's controls and readings, where it is described. */
  descriptor?: { controls: number; readings: number };
  source: string;
  links: string[];
}

export interface AuditManifestRecord extends ManifestEntry {
  evidence: Evidence;
  /** Whether its owner is found among the room's catalogued objects. */
  matched: boolean;
  /** The kind it is bound to in that kind's file, if any (mission 169). */
  boundTo?: string;
}

/**
 * Every `links` value in a document is relative to the site root (beside
 * `bench.html`); `linkBase` is the path from the document's own JSON URL
 * to that root, so a reader resolves `new URL(linkBase + link, jsonUrl)`.
 */
export interface LinkBase {
  linkBase: string;
}

export interface RoomAudit extends LinkBase {
  schemaVersion: number;
  subject: { type: 'room'; id: string };
  links: AuditLinks;
  objects: AuditObject[];
  manifest: AuditManifestRecord[];
  coverage: Record<Capability, Coverage>;
  signOff: SignOff;
  findings: AuditFinding[];
  counts: {
    objects: number;
    registered: number;
    unregistered: number;
    described: number;
    manifest: number;
    findings: number;
  };
}

export interface KindAudit extends LinkBase {
  schemaVersion: number;
  subject: { type: 'kind'; id: string };
  links: AuditLinks;
  registered: boolean;
  class: string;
  word: string;
  purpose: string;
  affordances?: Claim<KindAffordances>;
  placements: { room: string; refs: string[]; links: AuditLinks }[];
  descriptors: number;
  findings: AuditFinding[];
  counts: { placements: number; rooms: number; findings: number };
}

export interface AuditIndex extends LinkBase {
  schemaVersion: number;
  subject: { type: 'index'; id: 'audit' };
  rooms: {
    id: string;
    coverage: Record<Capability, Coverage>;
    signOff: SignOff;
    unresolved: number;
    links: AuditLinks;
  }[];
  kinds: {
    id: string;
    registered: boolean;
    placements: number;
    unresolved: number;
    links: AuditLinks;
  }[];
}

/** The JSON exports' paths, relative to the site's root (`base: './'`). */
export const auditJsonPath = {
  index: () => 'audit/index.json',
  room: (room: string) => `audit/room/${encodeURIComponent(room)}.json`,
  kind: (kind: string) => `audit/kind/${encodeURIComponent(kind)}.json`,
};

const roomLinks = (room: string): AuditLinks => ({
  html: auditLink(room),
  json: auditJsonPath.room(room),
});

const kindLinks = (kind: string): AuditLinks => ({
  html: itemAuditLink(kind),
  json: auditJsonPath.kind(kind),
});

const REGISTRY_SOURCE = 'src/game/plant/equipment-kinds.ts';
const CATALOGUE_SOURCE = 'src/toolkit/gallery/logic/kind-catalogue.ts';
const DESCRIPTOR_SOURCE = 'src/game/descriptors/registry.ts';

const affordancesOf = (
  kind: string,
  rulings: readonly AuditRuling[],
): Claim<KindAffordances> | undefined =>
  isKindId(kind)
    ? {
        value: resolveKindAffordances(EQUIPMENT_KINDS[kind]),
        evidence: rulingOf(kind, rulings)
          ? 'approved'
          : (EQUIPMENT_KINDS[kind] as EquipmentKind).affordances
            ? 'declared'
            : 'default',
        source: REGISTRY_SOURCE,
      }
    : undefined;

const byRef = <T extends { ref: string }>(a: T, b: T) =>
  a.ref < b.ref ? -1 : a.ref > b.ref ? 1 : 0;

const byId = (a: AuditFinding, b: AuditFinding) =>
  a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

/** The audit input: the catalogue once, shared by every document built from it. */
export interface AuditInput {
  kinds?: readonly KindEntry[];
  catalogue?: KindCatalogueInput;
  /** The transitional manifests, by room (`AUDIT_MANIFESTS`), for tests. */
  manifests?: Readonly<Record<string, () => RoomManifest>>;
  /** The owner's rulings (`AUDIT_RULINGS`), for tests. */
  rulings?: readonly AuditRuling[];
  /** The kind files (`kindFiles()`), for their bindings; for tests. */
  kindFiles?: Readonly<Record<string, KindFile>>;
}

const kindsOf = (input: AuditInput) =>
  input.kinds ?? kindCatalogue(input.catalogue ?? {});
const rulingsOf = (input: AuditInput) => input.rulings ?? AUDIT_RULINGS;
const manifestFor = (room: string, input: AuditInput): RoomManifest =>
  (input.manifests ?? AUDIT_MANIFESTS)[room]?.() ?? { room, entries: [] };

function objectOf(
  entry: LookEntry,
  described: Map<string, { controls: number; readings: number }>,
  rulings: readonly AuditRuling[],
): AuditObject {
  const registered = isKindId(entry.kind);
  const affordances = affordancesOf(entry.kind, rulings);
  const descriptor = described.get(entry.ref.toLowerCase());
  return {
    ref: entry.ref,
    title: entry.title,
    kind: entry.kind,
    registered,
    ...(entry.tag ? { tag: entry.tag } : {}),
    ...(entry.assetId ? { assetId: entry.assetId } : {}),
    ...(entry.model ? { model: entry.model } : {}),
    ...(entry.parent ? { parent: entry.parent } : {}),
    ...(affordances ? { affordances } : {}),
    ...(descriptor ? { descriptor } : {}),
    source: CATALOGUE_SOURCE,
    links: [objectDetailLink(entry.room, entry.ref), itemAuditLink(entry.kind)],
  };
}

/**
 * A room's coverage, per capability. Interaction is covered only where
 * descriptors describe the room's objects; seats and portable items are
 * known only from the manifest; solidity follows the registry, so a room
 * of registered kinds is partial (shapes are bounds until ruled) and an
 * unregistered object leaves it partial too. Nothing is ever `none` from
 * an empty list: absent data is `unknown`.
 */
function coverageOf(
  objects: readonly AuditObject[],
  manifest: RoomManifest,
): Record<Capability, Coverage> {
  const shown = (c: Capability) =>
    manifest.entries.some((e) => e.shows.includes(c));
  const described = objects.filter((o) => o.descriptor).length;
  const interaction: Coverage = !objects.length
    ? 'unknown'
    : described === objects.length
      ? 'covered'
      : described || shown('interaction')
        ? 'partial'
        : 'unknown';
  const solidity: Coverage = objects.some((o) => o.registered)
    ? 'partial'
    : 'unknown';
  const fromManifest = (c: Capability): Coverage =>
    shown(c) ? 'partial' : 'unknown';
  const coverage = {
    interaction,
    seats: fromManifest('seats'),
    portable: fromManifest('portable'),
    solidity,
  };
  return Object.fromEntries(
    CAPABILITIES.map((c) => [c, coverage[c]]),
  ) as Record<Capability, Coverage>;
}

function roomFindings(
  room: string,
  objects: readonly AuditObject[],
  manifest: readonly AuditManifestRecord[],
  coverage: Record<Capability, Coverage>,
): AuditFinding[] {
  const findings: AuditFinding[] = [];
  for (const o of objects)
    if (!o.registered)
      findings.push({
        id: `room:${room}:unregistered:${o.ref}`,
        severity: 'warning',
        room,
        kind: o.kind,
        ref: o.ref,
        message: `${o.title} has kind '${o.kind}', which is not in the object registry, so it can have no name, context, clicks or behaviour.`,
        evidence: 'declared',
        source: CATALOGUE_SOURCE,
        next: `Register '${o.kind}' in ${REGISTRY_SOURCE}, or rule it decorative.`,
        links: o.links,
      });
  for (const m of manifest)
    if (m.boundTo) continue;
    else if (!m.matched)
      findings.push({
        id: `room:${room}:manifest-unmatched:${m.ref}`,
        severity: 'warning',
        room,
        ref: m.ref,
        message: `${m.title} behaves (${m.behaviour}) but its owner ${m.owner ? `'${m.owner}' ` : ''}is not among the room's catalogued objects.`,
        evidence: 'declared',
        source: m.source,
        next: 'Register it as a kind, or join it to the catalogued object that owns it.',
        links: [],
      });
    else
      findings.push({
        id: `room:${room}:manifest-only:${m.ref}`,
        severity: 'info',
        room,
        ref: m.ref,
        message: `${m.title}: its behaviour (${m.shows.join(', ')}) is known only from the transitional manifest, not from the registry.`,
        evidence: 'declared',
        source: m.source,
        next: 'Propose a kind with these affordances for the owner to rule on.',
        links: [],
      });
  for (const c of CAPABILITIES)
    if (coverage[c] === 'unknown')
      findings.push({
        id: `room:${room}:coverage-unknown:${c}`,
        severity: 'info',
        room,
        message: `No data vouches for this room's ${c}: absence here is not proof of none.`,
        evidence: 'declared',
        source: `${CATALOGUE_SOURCE}; ${DESCRIPTOR_SOURCE}`,
        next: `Describe the room's objects (${DESCRIPTOR_SOURCE}) or record a manifest entry; verify this room for observed marks.`,
        links: [auditLink(room)],
      });
  return findings.sort(byId);
}

/** One room's audit, from data alone. */
export function roomAudit(room: string, input: AuditInput = {}): RoomAudit {
  const kinds = kindsOf(input);
  const described = new Map(
    objectDescriptors(room).map((d) => [
      d.ref.toLowerCase(),
      { controls: d.controls.length, readings: d.readings.length },
    ]),
  );
  const objects = lookCatalogue(room, kinds)
    .map((e) => objectOf(e, described, rulingsOf(input)))
    .sort(byRef);
  const manifestData = manifestFor(room, input);
  const owners = new Set(objects.flatMap((o) => [o.kind, o.ref]));
  // Things bound to a kind in its file (`npm run audit -- bind`) are registered.
  const bound = new Map<string, string>();
  for (const [kind, f] of Object.entries(input.kindFiles ?? kindFiles()))
    for (const b of f.bindings ?? [])
      if (b.room === room) bound.set(b.thing, kind);
  const manifest = manifestData.entries
    .map((m) => ({
      ...m,
      evidence: 'declared' as Evidence,
      matched: m.owner !== undefined && owners.has(m.owner),
      ...(bound.has(m.ref) ? { boundTo: bound.get(m.ref) } : {}),
    }))
    .sort(byRef);
  const coverage = coverageOf(objects, manifestData);
  const findings = roomFindings(room, objects, manifest, coverage);
  const ruling = rulingOf(room, rulingsOf(input));
  const unresolved = findings.filter((f) => f.severity !== 'info').length;
  const signOff: SignOff =
    ruling && !unresolved
      ? 'signed-off'
      : objects.length || manifest.length
        ? 'proposed'
        : 'not-started';
  return {
    schemaVersion: AUDIT_SCHEMA_VERSION,
    linkBase: '../../',
    subject: { type: 'room', id: room },
    links: roomLinks(room),
    objects,
    manifest,
    coverage,
    signOff,
    findings,
    counts: {
      objects: objects.length,
      registered: objects.filter((o) => o.registered).length,
      unregistered: objects.filter((o) => !o.registered).length,
      described: objects.filter((o) => o.descriptor).length,
      manifest: manifest.length,
      findings: findings.length,
    },
  };
}

/** One kind's audit, from data alone. */
export function kindAudit(kind: string, input: AuditInput = {}): KindAudit {
  const entry = kindsOf(input).find((k) => k.key === kind);
  const rooms = new Map<string, string[]>();
  for (const c of entry?.copies ?? [])
    rooms.set(c.room, [...(rooms.get(c.room) ?? []), c.ref]);
  const placements = [...rooms]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([room, refs]) => ({
      room,
      refs: refs.sort(),
      links: roomLinks(room),
    }));
  const registered = isKindId(kind);
  const affordances = affordancesOf(kind, rulingsOf(input));
  const findings: AuditFinding[] = [];
  if (!registered)
    findings.push({
      id: `kind:${kind}:unregistered`,
      severity: 'warning',
      kind,
      message: `'${kind}' is placed but not in the object registry.`,
      evidence: 'declared',
      source: CATALOGUE_SOURCE,
      next: `Register it in ${REGISTRY_SOURCE}, or rule it decorative.`,
      links: [itemAuditLink(kind)],
    });
  else if (!rulingOf(kind, rulingsOf(input)))
    findings.push({
      id: `kind:${kind}:affordances-unruled`,
      severity: 'info',
      kind,
      message: `'${kind}' has default affordances that the owner has not yet ruled on.`,
      evidence: 'declared',
      source: REGISTRY_SOURCE,
      next: 'Propose its interaction, portability, solidity, shape and seat for the owner.',
      links: [itemAuditLink(kind)],
    });
  return {
    schemaVersion: AUDIT_SCHEMA_VERSION,
    linkBase: '../../',
    subject: { type: 'kind', id: kind },
    links: kindLinks(kind),
    registered,
    class:
      entry?.class ??
      (registered ? EQUIPMENT_KINDS[kind].class : 'unclassified'),
    word: entry?.word ?? kind,
    purpose:
      entry?.purpose ?? (registered ? EQUIPMENT_KINDS[kind].purpose : ''),
    ...(affordances ? { affordances } : {}),
    placements,
    descriptors: objectDescriptors().filter((d) => d.kind === kind).length,
    findings: findings.sort(byId),
    counts: {
      placements: placements.reduce((n, p) => n + p.refs.length, 0),
      rooms: placements.length,
      findings: findings.length,
    },
  };
}

/** The index of every room and every kind, registered or placed. */
export function auditIndex(input: AuditInput = {}): AuditIndex {
  const kinds = kindsOf(input);
  const shared = { ...input, kinds };
  const rooms = [...ROOMS].sort().map((id) => {
    const a = roomAudit(id, shared);
    return {
      id,
      coverage: a.coverage,
      signOff: a.signOff,
      unresolved: a.findings.filter((f) => f.severity !== 'info').length,
      links: a.links,
    };
  });
  const keys = [
    ...new Set([...Object.keys(EQUIPMENT_KINDS), ...kinds.map((k) => k.key)]),
  ].sort();
  return {
    schemaVersion: AUDIT_SCHEMA_VERSION,
    linkBase: '../',
    subject: { type: 'index', id: 'audit' },
    rooms,
    kinds: keys.map((id) => {
      const k = kindAudit(id, shared);
      return {
        id,
        registered: k.registered,
        placements: k.counts.placements,
        unresolved: k.findings.filter((f) => f.severity !== 'info').length,
        links: k.links,
      };
    }),
  };
}

/** A document as its export's text: stable, two-space indented, one trailing newline. */
export const auditJson = (doc: RoomAudit | KindAudit | AuditIndex) =>
  `${JSON.stringify(doc, null, 2)}\n`;
