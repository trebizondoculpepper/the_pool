import type { Brand } from '../../components/core/logic/brands';
import { CLASS_ORDER, CLASS_WORDS, brandAudit } from './brand-audit';
import { EQUIPMENT_ROOMS } from './dev-room-links';
import { isDevRoom } from './kind-catalogue';
import type { KindEntry } from './kind-catalogue';
import {
  entryFields,
  lookLink as gameLookLink,
  matchesSearch,
} from './look-catalogue';
import { itemAuditLink } from './item-audit';
import type { LookEntry } from './look-catalogue';
import { BRANCH_WORDS, branchesInUse, pagesFor } from './page-registry';
import type { Branch, RegisteredRow } from './page-registry';
import { registeredPages } from './page-registry';

/**
 * The bench index's tree model (mission 137, `doc/plans/137-bench-index.md`):
 * Rooms, Things, Brands, Simulation (once 138 registers) and Tools, built
 * from data alone; a branch's rows are made only when it is opened (or
 * searched). Also the search, the counts and the open state's encoding for
 * links and storage. Pure: no DOM, no Three.js.
 */

export interface IndexLink {
  label: string;
  href: string;
}

export interface IndexNode {
  /** Its path segment; the node's path is its ancestors' ids joined by `/`. */
  id: string;
  label: string;
  href?: string;
  /** Small words after the label: kind, asset id, flags. */
  meta?: string;
  /** Shown on the branch while it is closed. */
  count?: string;
  /** Further links on the same row (look modes, audit row). */
  links?: readonly IndexLink[];
  /** Search words beyond the label. */
  fields?: readonly string[];
  /** Its rows, made on demand. Absent for a leaf. */
  children?: () => readonly IndexNode[];
}

export interface IndexInput {
  rooms: readonly string[];
  roomName: (room: string) => string;
  kinds: readonly KindEntry[];
  entries: readonly LookEntry[];
  brands: readonly Brand[];
  /** Rows registered pages offer (138's), resolved by the page before building. */
  rows?: Readonly<Record<string, readonly RegisteredRow[]>>;
}

/** The room groups, in order. `?dev` lists rooms ungrouped; this is the index's own. */
export const ROOM_GROUPS = [
  ['pools', 'Pool halls'],
  ['plant', 'Plant rooms'],
  ['control', 'Control rooms'],
  ['equipment', 'Equipment rooms (dev61 to dev69)'],
  ['dev', 'Development rooms'],
  ['museum', 'Museum halls'],
  ['other', 'Corridors, offices and the rest'],
] as const;
export type RoomGroup = (typeof ROOM_GROUPS)[number][0];

const PLANT_ROOMS = new Set([
  'boiler_house',
  'loading_bay',
  'hypo_store',
  'acid_store',
  'switch_room',
  'air_plant',
  'tank_hall',
  'plant_corridor',
]);

export function roomGroup(room: string): RoomGroup {
  if ((EQUIPMENT_ROOMS as readonly string[]).includes(room)) return 'equipment';
  if (/^(pool_|donut_pool|wet_hall)/.test(room)) return 'pools';
  if (/^plant_(pool|room|fit)/.test(room) || PLANT_ROOMS.has(room))
    return 'plant';
  if (room === 'control_room' || room === 'bridge') return 'control';
  if (room.startsWith('museum')) return 'museum';
  if (isDevRoom(room)) return 'dev';
  return 'other';
}

/** A look link from `bench.html`: to the game's page, not the bench's. */
const lookLink = (...a: Parameters<typeof gameLookLink>) =>
  `./${gameLookLink(...a)}`;

const plural = (n: number, word: string) =>
  `${n} ${n === 1 ? word : word === 'copy' ? 'copies' : `${word}s`}`;

const pageLeaves = (
  branch: Branch,
  subject: 'room' | 'kind' | 'brand',
  id: string,
): IndexNode[] =>
  pagesFor(branch, subject, id).map((p) => ({
    id: `page:${p.id}`,
    label: p.name,
    href: p.link(id),
  }));

const rowNode = (r: RegisteredRow): IndexNode => ({
  id: r.id,
  label: r.label,
  ...(r.href ? { href: r.href } : {}),
  ...(r.meta ? { meta: r.meta } : {}),
  ...(r.fields ? { fields: r.fields } : {}),
  ...(r.children?.length
    ? {
        count: plural(r.children.length, 'row'),
        children: () => r.children!.map(rowNode),
      }
    : {}),
});

/** A branch's own pages (subject `none`), each with any rows it offers. */
const ownPages = (branch: Branch, input: IndexInput): IndexNode[] =>
  pagesFor(branch, 'none').map((p) => {
    const rows = input.rows?.[p.id];
    return {
      id: `page:${p.id}`,
      label: p.name,
      href: p.link(''),
      ...(rows?.length
        ? {
            count: plural(rows.length, 'row'),
            children: () => rows.map(rowNode),
          }
        : {}),
    };
  });

function entryNode(e: LookEntry): IndexNode {
  const auditRow = `bench.html?bench=room-audit&room=${encodeURIComponent(e.room)}#row-${encodeURIComponent(e.ref)}`;
  const links: IndexLink[] = [];
  if (e.look !== 'none' && !e.parent)
    for (const m of ['left', 'right', 'above'] as const)
      links.push({ label: m, href: lookLink(e.room, e.ref, m) });
  links.push({
    label: 'audit row',
    href: auditRow,
  });
  return {
    id: e.ref,
    label: `${e.ref} · ${e.title}`,
    href: e.look !== 'none' ? lookLink(e.room, e.ref) : auditRow,
    meta: [e.kindWord, e.assetId, ...e.findings].filter(Boolean).join(' · '),
    links,
    fields: entryFields(e).filter((f): f is string => !!f),
  };
}

function roomsBranch(input: IndexInput): IndexNode {
  const byRoom = new Map<string, LookEntry[]>();
  for (const e of input.entries)
    byRoom.set(e.room, [...(byRoom.get(e.room) ?? []), e]);
  const roomNode = (room: string): IndexNode => {
    const mine = byRoom.get(room) ?? [];
    const flagged = mine.filter((e) => e.findings.length).length;
    return {
      id: room,
      label: input.roomName(room) === room ? room : `${input.roomName(room)}`,
      meta: input.roomName(room) === room ? '' : room,
      count: mine.length
        ? `${plural(mine.length, 'thing')}${flagged ? `, ${flagged} flagged` : ''}`
        : 'not counted',
      fields: [room, input.roomName(room)],
      children: () => [
        ...pageLeaves('rooms', 'room', room),
        ...mine.map(entryNode),
      ],
    };
  };
  const groups = ROOM_GROUPS.map(([id, label]) => {
    const rooms = input.rooms.filter((r) => roomGroup(r) === id);
    return {
      id,
      label,
      count: plural(rooms.length, 'room'),
      children: () => rooms.map(roomNode),
    } satisfies IndexNode;
  }).filter((g) => g.count !== '0 rooms');
  return {
    id: 'rooms',
    label: BRANCH_WORDS.rooms,
    count: plural(input.rooms.length, 'room'),
    children: () => [...ownPages('rooms', input), ...groups],
  };
}

function kindNode(kind: KindEntry): IndexNode {
  const byRoom = new Map<string, KindEntry['copies']>();
  for (const c of kind.copies)
    byRoom.set(c.room, [...(byRoom.get(c.room) ?? []), c]);
  const placements: IndexNode[] = [...byRoom].map(([room, copies]) => ({
    id: `in:${room}`,
    label: room || '(no room)',
    count: plural(copies.length, 'copy'),
    fields: [room],
    children: () =>
      copies.map((c) => ({
        id: c.ref,
        label: `${c.ref}${c.name && c.name !== c.ref ? ` · ${c.name}` : ''}`,
        href:
          c.look !== 'none' && c.room
            ? lookLink(c.room, c.ref)
            : itemAuditLink(kind.key),
        meta: [c.assetId, ...c.findings].filter(Boolean).join(' · '),
        fields: [c.ref, c.name, c.tag, c.assetId, c.room].filter(
          (f): f is string => !!f,
        ),
      })),
  }));
  return {
    id: kind.key,
    label: kind.word,
    meta: [kind.key, kind.maker].filter(Boolean).join(' · '),
    count: `${plural(kind.usage.count, 'copy')}, ${plural(kind.usage.rooms.length, 'room')}`,
    fields: [kind.key, kind.word, kind.maker ?? '', ...kind.aliases],
    children: () => [...pageLeaves('things', 'kind', kind.key), ...placements],
  };
}

function thingsBranch(input: IndexInput): IndexNode {
  const groups: IndexNode[] = CLASS_ORDER.map((cls) => {
    const kinds = input.kinds
      .filter((k) => k.class === cls)
      .sort((a, b) => a.word.localeCompare(b.word));
    return {
      id: cls,
      label: CLASS_WORDS[cls],
      count: plural(kinds.length, 'kind'),
      children: () => kinds.map(kindNode),
    };
  }).filter((g) => g.count !== '0 kinds');
  return {
    id: 'things',
    label: BRANCH_WORDS.things,
    count: plural(input.kinds.length, 'kind'),
    children: () => [...ownPages('things', input), ...groups],
  };
}

/** The path of a kind in the Things branch, for links from elsewhere. */
export const thingPath = (kind: KindEntry) =>
  `things/${kind.class}/${kind.key}`;

function brandsBranch(input: IndexInput): IndexNode {
  const brandNode = (brand: Brand): IndexNode => {
    const audit = brandAudit(brand, input.kinds);
    const kinds = audit.groups.flatMap((g) => g.items);
    return {
      id: brand.id,
      label: brand.name,
      count: `${plural(audit.kinds, 'kind')}, ${plural(audit.copies, 'copy')}`,
      fields: [brand.id, brand.name],
      children: () => [
        ...pageLeaves('brands', 'brand', brand.id),
        ...kinds.map((m) => ({
          id: m.kind.key,
          label: m.kind.word,
          href: itemAuditLink(m.kind.key),
          links: [
            { label: 'in Things', href: `#${pathToHash(thingPath(m.kind))}` },
          ],
          meta: `${plural(m.copies.length, 'copy')}${m.whole ? '' : ', shared'}`,
          fields: [m.kind.key, m.kind.word],
        })),
      ],
    };
  };
  return {
    id: 'brands',
    label: BRANCH_WORDS.brands,
    count: plural(input.brands.length, 'brand'),
    children: () => [
      ...ownPages('brands', input),
      ...input.brands.map(brandNode),
    ],
  };
}

const plainBranch = (branch: Branch, input: IndexInput): IndexNode => {
  const pages = ownPages(branch, input);
  return {
    id: branch,
    label: BRANCH_WORDS[branch],
    count: plural(pages.length, 'page'),
    children: () => pages,
  };
};

/** The index's top-level branches. Simulation appears once a page registers there. */
export function buildIndex(input: IndexInput): IndexNode[] {
  return branchesInUse().map((b) =>
    b === 'rooms'
      ? roomsBranch(input)
      : b === 'things'
        ? thingsBranch(input)
        : b === 'brands'
          ? brandsBranch(input)
          : plainBranch(b, input),
  );
}

/** The pages registered with subject `none` that offer rows (resolve them before `buildIndex`). */
export const pagesWithRows = () => registeredPages().filter((p) => p.rows);

// --- Search ---------------------------------------------------------------

export interface SearchResult {
  nodes: IndexNode[];
  /** Paths to open so every match shows. */
  open: Set<string>;
  matches: number;
}

const nodeFields = (n: IndexNode) => [
  n.id,
  n.label,
  n.meta ?? '',
  ...(n.fields ?? []),
];

/**
 * The tree cut to what matches every word: a match keeps its whole subtree,
 * an ancestor of a match keeps only the way to it and is opened.
 */
export function searchIndex(
  nodes: readonly IndexNode[],
  words: readonly string[],
  base = '',
): SearchResult {
  const open = new Set<string>();
  let matches = 0;
  const out: IndexNode[] = [];
  for (const n of nodes) {
    const path = base ? `${base}/${n.id}` : n.id;
    if (matchesSearch(words, nodeFields(n))) {
      matches++;
      out.push(n);
      if (n.children) open.add(path);
      continue;
    }
    if (!n.children) continue;
    const inner = searchIndex(n.children(), words, path);
    if (!inner.matches) continue;
    matches += inner.matches;
    open.add(path);
    for (const p of inner.open) open.add(p);
    out.push({
      ...n,
      count: `${inner.matches} found`,
      children: () => inner.nodes,
    });
  }
  return { nodes: out, open, matches };
}

// --- Open state, links and storage ----------------------------------------

/** A path's segments, decoded. */
export const pathSegments = (path: string) =>
  path
    .split('/')
    .filter(Boolean)
    .map((s) => {
      try {
        return decodeURIComponent(s);
      } catch {
        return s;
      }
    });

/** A path for a hash or `?open=`: each segment encoded, slashes kept. */
export const pathToHash = (path: string) =>
  path.split('/').map(encodeURIComponent).join('/');

/** A path's ancestors and itself, shortest first: `a`, `a/b`, `a/b/c`. */
export const pathAndAncestors = (path: string) => {
  const segs = pathSegments(path);
  return segs.map((_, i) => segs.slice(0, i + 1).join('/'));
};

/** The branch a link asks for: `#rooms/boiler_house`, else `?open=rooms/boiler_house`. */
export function linkedPath(hash: string, search: string): string | undefined {
  const h = hash.replace(/^#/, '');
  if (h && !h.startsWith('row-')) return canonicalPath(h);
  const q = new URLSearchParams(search).get('open');
  return q ? canonicalPath(q) : undefined;
}

/**
 * A linked path in full: `rooms/boiler_house` is short for
 * `rooms/plant/boiler_house` (its group is worked out).
 */
export function canonicalPath(path: string): string {
  const segs = pathSegments(path);
  const groups = ROOM_GROUPS.map(([id]) => id as string);
  if (segs[0] === 'rooms' && segs[1] && !groups.includes(segs[1]))
    segs.splice(1, 0, roomGroup(segs[1]));
  return segs.join('/');
}

/** Find a node by its path, opening branches on the way. */
export function nodeAt(
  nodes: readonly IndexNode[],
  path: string,
): IndexNode | undefined {
  let level: readonly IndexNode[] = nodes;
  let found: IndexNode | undefined;
  for (const seg of pathSegments(path)) {
    found = level.find((n) => n.id === seg);
    if (!found) return undefined;
    level = found.children?.() ?? [];
  }
  return found;
}

export interface IndexState {
  open: string[];
  query: string;
}
export interface KeyValue {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export const INDEX_STORE = 'pool.bench-index';

/** The viewer's remembered state; empty when storage is missing or broken. */
export function loadState(store: KeyValue | undefined): IndexState {
  try {
    const s = JSON.parse(
      store?.getItem(INDEX_STORE) ?? '{}',
    ) as Partial<IndexState>;
    return {
      open: Array.isArray(s.open)
        ? s.open.filter((p) => typeof p === 'string')
        : [],
      query: typeof s.query === 'string' ? s.query : '',
    };
  } catch {
    return { open: [], query: '' };
  }
}

export function saveState(store: KeyValue | undefined, state: IndexState) {
  try {
    store?.setItem(INDEX_STORE, JSON.stringify(state));
  } catch {
    // A private window: the index works, it just forgets.
  }
}
