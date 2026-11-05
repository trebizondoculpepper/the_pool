import { INSTALLED_ASSET_IDS } from '../../../game/plant/installed-asset-ids';
import {
  describedComponents,
  plantInventory,
} from '../../../game/plant/equipment-catalogue';
import { EQUIPMENT_KINDS } from '../../../game/plant/equipment-kinds';
import { kindFiles } from '../../../game/plant/kind-files';
import { EQUIPMENT_ROOM_CODES } from '../../../game/plant/room-names';
import { brandById } from '../../components/core/logic/brands';
import type { BrandId } from '../../components/core/logic/brands';
import { ROOM_ALIASES } from './dev-room-links';
import { slugOf } from './look-ref';
import { objectClass } from './object-class';
import type { ObjectClass } from './object-class';
import { placedRoomItems } from './room-usage';
import type { RoomItems } from './room-usage';

/**
 * The catalogue of every kind of game object (mission 126): each kind, from
 * the kinds' register and what the rooms place, with its copies room by
 * room, their parts, where it is used, and how well each is named. Built
 * from data alone, never from a scene, so the dev panel opens quickly and
 * the text mode (mission 128) can read it without Three.js.
 */

/** What is wrong with a name, judged from data alone (see the brief's "What properly named means"). */
export type Finding =
  | 'no-kind'
  | 'no-tag'
  | 'tag-not-hierarchical'
  | 'generic-name'
  | 'duplicate-name'
  | 'no-maker';

/** The findings that make a thing badly named; `no-maker` is a softer note. */
export const NAMING_FINDINGS: readonly Finding[] = [
  'no-kind',
  'no-tag',
  'tag-not-hierarchical',
  'generic-name',
  'duplicate-name',
];

/** Each finding in words, for the panel and the console. */
export const FINDING_WORDS: Record<Finding, string> = {
  'no-kind': 'no kind in the register',
  'no-tag': 'no tag',
  'tag-not-hierarchical': "tag not under its room's code",
  'generic-name': 'generic name',
  'duplicate-name': 'name repeated in its room, no tag',
  'no-maker': 'no maker recorded',
};

export const isBadlyNamed = (findings: readonly Finding[]) =>
  findings.some((f) => NAMING_FINDINGS.includes(f));

/** A development room: a numbered `devN` room (dev19b, dev54_1 too), or an old name of one. */
export const isDevRoom = (room: string) =>
  /^dev\d/.test(room) || Object.hasOwn(ROOM_ALIASES, room);

/** A development room's exhibit, read from its room module's `EXHIBITS` (no scene built). */
export interface DevExhibit {
  room: string;
  title: string;
  /** The placed kind it is the model of (`MODELS`), if any. */
  kind?: string;
  maker?: BrandId;
}

/** A placed kind's model exhibit (`MODELS`): its product and maker, for search and makers. */
export interface KindModel {
  title: string;
  reference?: string;
  maker?: BrandId;
}

/** The shared classification's (`object-class.ts`, mission 127), or none. */
export type KindClass = ObjectClass | 'unclassified';

/** Where a copy's identity comes from. */
export type CopySource =
  | 'layout'
  | 'sign'
  | 'model'
  | 'register'
  | 'control'
  | 'exhibit'
  | 'binding';

/**
 * Whether a look link to it is expected to land: `expected`, a thing a
 * room with the look hook marks by this ref; `unverified`, named in data
 * but not known to be marked in its scene (127 checks); `none`, decoration.
 * An architectural component (a sign) is lookable, never `none`.
 */
export type Lookable = 'expected' | 'unverified' | 'none';

export interface CatalogueCopy {
  room: string;
  kind: string;
  name: string;
  tag?: string;
  assetId?: string;
  /** Its look ref (125's form): its tag, else its name's slug. */
  ref: string;
  /** The tag of the thing it is a part of, where its tag nests under one. */
  parent?: string;
  source: CopySource;
  /** Its model address, where its tag is the identified model's (`identification.ts`). */
  model?: string;
  maker?: BrandId;
  /** The layout's item key, for placed things (`balance-tank:3x2x2`). */
  itemKey?: string;
  look: Lookable;
  exempt: boolean;
  findings: Finding[];
}

export interface KindEntry {
  key: string;
  word: string;
  class: KindClass;
  /** Its maker, from the kinds' register, its model, or every copy naming one. */
  maker?: BrandId;
  purpose: string;
  /** In `EQUIPMENT_KINDS`. */
  registered: boolean;
  copies: CatalogueCopy[];
  usage: { count: number; rooms: string[]; outsideDev: number };
  /** The kind's own findings. */
  findings: Finding[];
  /** Its own and every copy's findings together, each once. */
  worst: Finding[];
  /** Decorative: exempt from every finding. */
  exempt: boolean;
  /** Search words: its product, its maker's name. */
  aliases: string[];
}

export interface KindCatalogueInput {
  exhibits?: readonly DevExhibit[];
  models?: Readonly<Record<string, KindModel>>;
  /** The equipped rooms' placed items (`placedRoomItems`), for tests. */
  rooms?: readonly RoomItems[];
}

const SIGN_KEY = 'sign';
const BARE_WORDS = new Set([
  'pump',
  'valve',
  'filter',
  'panel',
  'tank',
  'mimic',
  'sign',
  'board',
  'exhibit',
  'machine',
  'thing',
  'object',
]);

/** A name that says nothing of which one it is (see the brief). */
export function genericName(name: string, tag?: string, word?: string) {
  const n = name.trim().toLowerCase();
  if (!n) return true;
  if (tag && n === tag.toLowerCase()) return true;
  if (word && n === word.trim().toLowerCase()) return true;
  return BARE_WORDS.has(n);
}

const roomCode = (room: string): string | undefined =>
  (EQUIPMENT_ROOM_CODES as Record<string, string>)[room];

const kindInfo = (key: string) =>
  Object.hasOwn(EQUIPMENT_KINDS, key)
    ? (
        EQUIPMENT_KINDS as Record<
          string,
          {
            type: string;
            class: ObjectClass;
            purpose: string;
            brand?: BrandId;
          }
        >
      )[key]
    : undefined;

/** The kind's key of a layout item key: `balance-tank:3x2x2` is `balance-tank`. */
const kindOfKey = (key: string) => key.split(':')[0];

/**
 * Every kind of game object with its copies, usage and findings: from the
 * kinds' register, the equipped rooms' layouts and the register, the bill
 * of parts (model parts, fixtures, valves, switch-fuses, pumps), and the
 * dev rooms' exhibits where they are given.
 */
export function kindCatalogue(input: KindCatalogueInput = {}): KindEntry[] {
  const copies: CatalogueCopy[] = [];
  const models = input.models ?? {};

  // The equipped rooms' placed items, named by the register.
  const layoutTags = new Set<string>();
  for (const { room, items } of input.rooms ?? placedRoomItems())
    for (const item of items) {
      const kind = kindOfKey(item.key);
      const installed =
        INSTALLED_ASSET_IDS[`${room}|${item.key}|${item.label}`];
      if (installed) layoutTags.add(installed.tag);
      const decorative = objectClass(item.key) === 'decorative';
      copies.push({
        room,
        kind,
        name: item.label,
        ...(installed
          ? { tag: installed.tag, assetId: installed.assetId }
          : {}),
        ref: installed?.tag ?? slugOf(item.label),
        source: kind === SIGN_KEY ? 'sign' : 'layout',
        itemKey: item.key,
        look: decorative ? 'none' : installed ? 'expected' : 'unverified',
        exempt: decorative,
        findings: [],
      });
    }

  // The bill of parts: everything else the model and the register name.
  const { subjects } = describedComponents();
  for (const entry of plantInventory()) {
    if (layoutTags.has(entry.id)) continue;
    const subject = subjects.get(entry.id);
    const kind = subject?.kind ?? entry.kind;
    if (kind === 'plant-room') continue;
    const decorative = objectClass(kind) === 'decorative';
    copies.push({
      room: subject?.room ?? '',
      kind,
      name: entry.name,
      tag: entry.id,
      ...(entry.assetId ? { assetId: entry.assetId } : {}),
      ref: entry.id,
      source:
        entry.source === 'model'
          ? 'model'
          : entry.source === 'control'
            ? 'control'
            : 'register',
      ...(entry.brand !== 'unbranded' ? { maker: entry.brand } : {}),
      ...(entry.source === 'model' ? { model: entry.id } : {}),
      look: decorative ? 'none' : 'unverified',
      exempt: decorative,
      findings: [],
    });
  }

  // The bound water bodies are room architecture with no layout item.
  // Other bindings (for example loose software boxes) identify a kind but
  // do not establish an installed catalogue copy.
  for (const [kind, file] of Object.entries(kindFiles()))
    for (const binding of file.bindings ?? []) {
      if (!file.traits?.includes('water-body')) continue;
      if (
        copies.some(
          (copy) => copy.room === binding.room && copy.ref === binding.thing,
        )
      )
        continue;
      const decorative = objectClass(kind) === 'decorative';
      copies.push({
        room: binding.room,
        kind,
        name: binding.thing.replaceAll('-', ' '),
        ref: binding.thing,
        source: 'binding',
        look: decorative ? 'none' : 'unverified',
        exempt: decorative,
        findings: [],
      });
    }

  // The dev rooms' exhibits: a model of a placed kind counts as a copy of it.
  for (const exhibit of input.exhibits ?? []) {
    const kind = exhibit.kind ?? `exhibit:${slugOf(exhibit.title)}`;
    const decorative = objectClass(kind) === 'decorative';
    copies.push({
      room: exhibit.room,
      kind,
      name: exhibit.title,
      ref: slugOf(exhibit.title),
      source: 'exhibit',
      ...(exhibit.maker ? { maker: exhibit.maker } : {}),
      look: decorative ? 'none' : 'expected',
      exempt: decorative,
      findings: [],
    });
  }

  // Parts: a tag nesting one level under another's (PL2-P1-P1 under PL2-P1).
  const tags = new Set(copies.flatMap((c) => (c.tag ? [c.tag] : [])));
  for (const copy of copies) {
    if (!copy.tag) continue;
    const parent = copy.tag.split('-').slice(0, -1).join('-');
    if (parent && parent !== copy.tag && tags.has(parent)) copy.parent = parent;
  }

  // The copies' findings.
  const untaggedNames = new Map<string, number>();
  for (const c of copies)
    if (!c.tag && !c.exempt) {
      const k = `${c.room}|${c.name.toLowerCase()}`;
      untaggedNames.set(k, (untaggedNames.get(k) ?? 0) + 1);
    }
  for (const c of copies) {
    if (c.exempt) continue;
    const info = kindInfo(c.kind);
    const architectural = objectClass(c.kind) === 'architectural';
    const f: Finding[] = [];
    if (!info && c.kind !== SIGN_KEY) f.push('no-kind');
    const dev = isDevRoom(c.room);
    // An architectural component is found by its name, not a plant tag.
    if (!c.tag && !dev && !architectural) f.push('no-tag');
    const code = roomCode(c.room);
    if (c.tag && code && c.tag !== code && !c.tag.startsWith(`${code}-`))
      f.push('tag-not-hierarchical');
    // A tagged thing may be called by its kind's word (its tag tells
    // which), as may a dev room's exhibit (one of a kind on show); any
    // other untagged thing is found by its name, so it must say which.
    if (genericName(c.name, c.tag, c.tag || dev ? undefined : info?.type))
      f.push('generic-name');
    if (
      !c.tag &&
      (untaggedNames.get(`${c.room}|${c.name.toLowerCase()}`) ?? 0) > 1
    )
      f.push('duplicate-name');
    if (
      info &&
      info.class !== 'decorative' &&
      !architectural &&
      !c.maker &&
      !info.brand &&
      !models[c.kind]?.maker
    )
      f.push('no-maker');
    c.findings = f;
  }

  // The kinds: the register's, then any other key the copies use.
  const keys = [
    ...Object.keys(EQUIPMENT_KINDS).filter((k) => k !== 'plant-room'),
    ...new Set(copies.map((c) => c.kind)),
  ].filter((k, i, all) => all.indexOf(k) === i);
  const byKind = new Map<string, CatalogueCopy[]>();
  for (const c of copies)
    byKind.set(c.kind, [...(byKind.get(c.kind) ?? []), c]);

  return keys.map((key): KindEntry => {
    const info = kindInfo(key);
    const list = byKind.get(key) ?? [];
    const exhibitTitle = key.startsWith('exhibit:') ? list[0]?.name : undefined;
    const cls: KindClass = objectClass(key) ?? 'unclassified';
    const makers = new Set(list.map((c) => c.maker));
    const maker =
      info?.brand ??
      models[key]?.maker ??
      (list.length && makers.size === 1 ? list[0].maker : undefined);
    const exempt = cls === 'decorative';
    const own: Finding[] = [];
    if (!exempt) {
      if (!info && key !== SIGN_KEY) own.push('no-kind');
      const named =
        maker || (list.length > 0 && list.every((c) => c.maker !== undefined));
      if (info && !named && cls !== 'architectural') own.push('no-maker');
    }
    const worst = [...new Set([...own, ...list.flatMap((c) => c.findings)])];
    const rooms = [...new Set(list.map((c) => c.room))];
    const model = models[key];
    return {
      key,
      word:
        key === SIGN_KEY
          ? 'Sign or notice'
          : (info?.type ?? exhibitTitle ?? key),
      class: cls,
      ...(maker ? { maker } : {}),
      purpose:
        info?.purpose ??
        (key === SIGN_KEY
          ? 'A notice on a wall: an architectural component, named by its words (mission 127).'
          : 'A development room exhibit that no kind in the register claims.'),
      registered: !!info,
      copies: list,
      usage: {
        count: list.length,
        rooms,
        outsideDev: list.filter((c) => !isDevRoom(c.room)).length,
      },
      findings: own,
      worst,
      exempt,
      aliases: [
        ...(model ? [model.title, model.reference ?? ''] : []),
        ...(maker ? [brandById(maker)?.name ?? maker] : []),
      ].filter(Boolean),
    };
  });
}
