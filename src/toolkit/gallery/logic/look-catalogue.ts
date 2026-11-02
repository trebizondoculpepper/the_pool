import { EQUIPMENT_KINDS } from '../../../game/plant/equipment-kinds';
import { brandById } from '../../components/core/logic/brands';
import { kindCatalogue } from './kind-catalogue';
import type {
  CatalogueCopy,
  Finding,
  KindCatalogueInput,
  KindEntry,
  Lookable,
} from './kind-catalogue';
import type { LookMode } from './look-ref';

/**
 * Each room's contents as the catalogue knows them (mission 126): one entry
 * per named thing, with its look ref (125's form), its kind, its parts and
 * how well it is named. Pure and scene-free, shared with 127's audit and
 * 128's text mode.
 */
export interface LookEntry {
  room: string;
  ref: string;
  title: string;
  kind: string;
  kindWord: string;
  tag?: string;
  assetId?: string;
  /** Its model address, where it has one. */
  model?: string;
  /** The tag of the thing it is part of. */
  parent?: string;
  /** Search words beyond tag, title and asset id: kind, its word, maker, product. */
  aliases: string[];
  /** Its parts' refs (tags nesting under its own). */
  parts: string[];
  modes: LookMode[];
  look: Lookable;
  findings: Finding[];
}

/** The modes that suit a thing: `above` for what stands on the floor. */
const modesOf = (copy: CatalogueCopy): LookMode[] =>
  copy.parent
    ? ['front', 'detail']
    : ['front', 'left', 'right', 'above', 'room'];

/** The entries of every room, or of one, from the kinds' catalogue. */
export function lookCatalogue(
  room?: string,
  input: KindCatalogueInput | readonly KindEntry[] = {},
): LookEntry[] {
  const kinds = Array.isArray(input)
    ? (input as readonly KindEntry[])
    : kindCatalogue(input as KindCatalogueInput);
  const entries: LookEntry[] = [];
  for (const kind of kinds)
    for (const copy of kind.copies) {
      if (room !== undefined && copy.room !== room) continue;
      const maker = copy.maker ?? kind.maker;
      entries.push({
        room: copy.room,
        ref: copy.ref,
        title: copy.name,
        kind: kind.key,
        kindWord: kind.word,
        ...(copy.tag ? { tag: copy.tag } : {}),
        ...(copy.assetId ? { assetId: copy.assetId } : {}),
        ...(copy.model ? { model: copy.model } : {}),
        ...(copy.parent ? { parent: copy.parent } : {}),
        aliases: [
          kind.key,
          kind.word,
          ...(maker ? [brandById(maker)?.name ?? maker] : []),
          ...kind.aliases,
        ],
        parts: [],
        modes: modesOf(copy),
        look: copy.look,
        findings: copy.findings,
      });
    }
  const byTag = new Map(
    entries.flatMap((e) => (e.tag ? [[`${e.room}|${e.tag}`, e] as const] : [])),
  );
  for (const e of entries)
    if (e.parent) byTag.get(`${e.room}|${e.parent}`)?.parts.push(e.ref);
  return entries;
}

/** Whether an entry matches a search: every word in its tag, title, asset id, aliases or room. */
export function matchesSearch(
  words: readonly string[],
  fields: readonly (string | undefined)[],
) {
  if (!words.length) return true;
  const hay = fields.filter(Boolean).join(' ').toLowerCase();
  return words.every((w) => hay.includes(w));
}

/** A search's words, lower case. */
export const searchWords = (query: string) =>
  query.toLowerCase().split(/\s+/).filter(Boolean);

/** An entry's search fields. */
export const entryFields = (e: LookEntry) => [
  e.ref,
  e.tag,
  e.title,
  e.assetId,
  e.room,
  ...e.aliases,
];

/** A look link (mission 125), relative, so it works in every build. */
export function lookLink(room: string, ref: string, mode: LookMode = 'front') {
  const q = new URLSearchParams({ room, look: ref });
  if (mode !== 'front') q.set('mode', mode);
  return `?${q.toString()}`;
}

/**
 * The per-room audit page (mission 129, `doc/plans/129-room-audit.md`),
 * served by `bench.html` on the development server.
 */
export const auditLink = (room: string) =>
  `bench.html?bench=room-audit&room=${encodeURIComponent(room)}`;

/** The registered kinds' words, for the console. */
export const kindWord = (key: string) =>
  (EQUIPMENT_KINDS as Record<string, { type: string } | undefined>)[key]
    ?.type ?? key;
