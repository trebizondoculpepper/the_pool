import { BRANDS } from '../../toolkit/components/core/logic/brands';
import { KIND_FILES } from './kinds/index';
import type {
  Classification,
  DescriptionTemplate,
  KindAffordanceDeclaration,
  StatusPolicy,
} from './equipment-kinds';

/**
 * The object registry as one JSON file per kind (mission 168; the owner,
 * 2026-11-04): `src/game/plant/kinds/<kind>.json`, listed by the index
 * `kinds/index.ts`. Registering a kind is adding its file, unregistering
 * removing it, and its traits, mounting and the rest are edits to that one
 * file, made only by `npm run audit -- register | set | unset |
 * unregister | bind`, never by hand. This module is the format: its
 * fields, the trait vocabulary and its consistency rules, the validator,
 * the one way a file and the index are written, and the edits the
 * commands make. The game's registry stays `equipment-kinds.ts` until
 * mission 171 migrates it. Pure.
 */

export const KIND_FILE_DIR = 'src/game/plant/kinds';
export const KIND_INDEX_FILE = `${KIND_FILE_DIR}/index.ts`;

/** The traits (mission 170): combinable; the flags follow from them. */
export const TRAITS = [
  'box-like',
  'chair-like',
  'decorative',
  'luggable',
  'operable',
  'panel-like',
  'portable',
  'run-like',
] as const;
export type Trait = (typeof TRAITS)[number];

export const TRAIT_WORDS: Record<Trait, string> = {
  'box-like':
    'a rectangular solid: its top holds objects, walkable where reachable',
  'chair-like': 'something to sit on',
  decorative: 'intentionally inert: seen, does nothing',
  luggable: 'large or heavy but movable: shifted, not carried',
  operable: 'has working controls',
  'panel-like': 'flat on a wall: signs, noticeboards, wall instruments',
  portable: 'can be picked up and carried',
  'run-like': 'pipes, cables, ducts: not solid, walk-through',
};

/** What a kind stands on, and which face of it meets that support. */
export const MOUNTS = ['floor', 'wall', 'ceiling'] as const;
export type MountOn = (typeof MOUNTS)[number];
export const FACES = ['+x', '-x', '+y', '-y', '+z', '-z'] as const;
export type Face = (typeof FACES)[number];

export interface KindMount {
  on: MountOn;
  /** The object's face that meets its support, in its own frame. */
  face: Face;
}

/** A thing with no identity of its own in the scene, tied to this kind. */
export interface KindBinding {
  room: string;
  thing: string;
}

export interface KindFile {
  group: 'placed' | 'other';
  type: string;
  code: string;
  class: Classification;
  status: StatusPolicy;
  template?: DescriptionTemplate;
  purpose: string;
  brand?: string;
  affordances?: KindAffordanceDeclaration;
  traits?: Trait[];
  mount?: KindMount;
  /** Source files to scan for its behaviour, beyond those found by name. */
  sources?: string[];
  bindings?: KindBinding[];
}

/** Every field, in the one order a file is written. */
export const FIELD_ORDER: readonly (keyof KindFile)[] = [
  'group',
  'type',
  'code',
  'class',
  'status',
  'template',
  'purpose',
  'brand',
  'affordances',
  'traits',
  'mount',
  'sources',
  'bindings',
];

const CLASSES: readonly Classification[] = ['plant', 'non-plant', 'decorative'];
const STATUSES: readonly StatusPolicy[] = [
  'none',
  'motor',
  'level',
  'pump-set',
  'cabinet',
  'booster',
  'switch',
  'gas',
  'uv',
  'filter',
];
const TEMPLATES: readonly DescriptionTemplate[] = [
  'valve',
  'power',
  'equipment',
];

/** A kind's id: lower case words joined by hyphens. */
export const KIND_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface Problem {
  kind: string;
  field?: string;
  message: string;
}

/**
 * The traits' consistency rules (mission 170): `error`s are refused;
 * `odd` combinations are reported for a person to confirm.
 */
export function traitProblems(
  kind: string,
  traits: readonly Trait[],
): { errors: Problem[]; odd: Problem[] } {
  const has = (t: Trait) => traits.includes(t);
  const errors: Problem[] = [];
  const odd: Problem[] = [];
  for (const t of ['operable', 'chair-like', 'portable', 'luggable'] as const)
    if (has('decorative') && has(t))
      errors.push({
        kind,
        field: 'traits',
        message: `decorative and ${t} contradict: decorative means it does nothing`,
      });
  if (has('portable') && has('luggable'))
    errors.push({
      kind,
      field: 'traits',
      message:
        'portable and luggable contradict: carried, or shifted, not both',
    });
  if (has('decorative') && has('box-like'))
    odd.push({
      kind,
      field: 'traits',
      message:
        'decorative and box-like is odd: decorative implies walk-through',
    });
  if (new Set(traits).size !== traits.length)
    errors.push({ kind, field: 'traits', message: 'a trait is listed twice' });
  return { errors, odd };
}

const BRAND_IDS = new Set(BRANDS.map((b) => b.id as string));

/** One file's problems, as refused by the commands and by CI. */
export function validateKindFile(kind: string, f: KindFile): Problem[] {
  const p: Problem[] = [];
  const bad = (field: string, message: string) =>
    p.push({ kind, field, message });
  if (!KIND_ID.test(kind))
    p.push({
      kind,
      message: 'a kind id is lower-case words joined by hyphens',
    });
  if (f.group !== 'placed' && f.group !== 'other')
    bad('group', 'is placed or other');
  if (!f.type?.trim()) bad('type', 'is required');
  if (!/^[A-Z][A-Z0-9]{0,3}$/.test(f.code ?? ''))
    bad('code', 'is one to four capitals or digits, starting with a capital');
  if (!CLASSES.includes(f.class))
    bad('class', `is one of ${CLASSES.join(', ')}`);
  if (!STATUSES.includes(f.status))
    bad('status', `is one of ${STATUSES.join(', ')}`);
  if (f.template !== undefined && !TEMPLATES.includes(f.template))
    bad('template', `is one of ${TEMPLATES.join(', ')}`);
  if (!f.purpose?.trim()) bad('purpose', 'is required');
  if (f.brand !== undefined && !BRAND_IDS.has(f.brand))
    bad('brand', `'${f.brand}' is not a brand in brands.ts`);
  if (f.traits !== undefined) {
    for (const t of f.traits)
      if (!TRAITS.includes(t))
        bad('traits', `'${t}' is not a trait (${TRAITS.join(', ')})`);
    p.push(
      ...traitProblems(
        kind,
        f.traits.filter((t) => TRAITS.includes(t)),
      ).errors,
    );
  }
  if (f.mount !== undefined) {
    if (!MOUNTS.includes(f.mount.on))
      bad('mount', `stands on ${MOUNTS.join(', ')}`);
    if (!FACES.includes(f.mount.face))
      bad('mount', `its face is one of ${FACES.join(', ')}`);
  }
  for (const b of f.bindings ?? [])
    if (!b.room?.trim() || !b.thing?.trim())
      bad('bindings', 'each names a room and a thing');
  for (const key of Object.keys(f))
    if (!FIELD_ORDER.includes(key as keyof KindFile))
      bad(key, 'is not a field of a kind file');
  return p;
}

/**
 * The whole registry's problems: each file's, and the index naming exactly
 * the files there are, each in its group, sorted.
 */
export function validateRegistry(
  files: Readonly<Record<string, KindFile>>,
  index: Readonly<Record<KindFile['group'], readonly string[]>>,
): Problem[] {
  const p: Problem[] = [];
  for (const [kind, f] of Object.entries(files))
    p.push(...validateKindFile(kind, f));
  // Tag codes are shared by family (every tank is T, every panel CP): not unique.
  for (const group of ['placed', 'other'] as const) {
    const ids = index[group];
    for (const id of ids)
      if (!files[id])
        p.push({ kind: id, message: 'in the index but has no file' });
      else if (files[id].group !== group)
        p.push({
          kind: id,
          message: `listed as ${group} in the index but its file says ${files[id].group}`,
        });
    if ([...ids].sort().join() !== ids.join())
      p.push({ kind: '(index)', message: `the ${group} list is not sorted` });
  }
  const listed = new Set([...index.placed, ...index.other]);
  for (const id of Object.keys(files))
    if (!listed.has(id))
      p.push({ kind: id, message: 'has a file but is not in the index' });
  return p;
}

/**
 * A kind file's text: fields in the one order, two-space indented, one
 * newline. The command then runs the project's formatter on what it wrote,
 * so the stored form is the formatter's and the pre-commit hook leaves it be.
 */
export function kindFileText(f: KindFile): string {
  const ordered: Record<string, unknown> = {};
  for (const key of FIELD_ORDER)
    if (f[key] !== undefined) ordered[key] = f[key];
  return `${JSON.stringify(ordered, null, 2)}\n`;
}

/** The index's text: the placed kinds and the others, each sorted, one per line. */
export function indexText(
  entries: readonly { id: string; group: KindFile['group'] }[],
): string {
  const ids = (group: KindFile['group']) =>
    [...new Set(entries.filter((e) => e.group === group).map((e) => e.id))]
      .sort()
      .map((id) => `  '${id}',`);
  return [
    '/**',
    " * Every registered kind, placed by the rooms' layouts or other, one per",
    ' * line, sorted (mission 168): kept by `npm run audit -- register` and',
    ' * `unregister` with the kind files beside it, never by hand. A test fails',
    ' * if it and the directory disagree.',
    ' */',
    'export const PLACED_KIND_IDS = [',
    ...ids('placed'),
    '] as const;',
    '',
    'export const OTHER_KIND_IDS = [',
    ...ids('other'),
    '] as const;',
    '',
    'export const KIND_IDS = [...PLACED_KIND_IDS, ...OTHER_KIND_IDS] as const;',
    '',
    '/** The kind files themselves, gathered here so this file changes when they come or go. */',
    "export const KIND_FILES: Record<string, unknown> = import.meta.glob('./*.json', {",
    '  eager: true,',
    "  import: 'default',",
    '});',
    '',
  ].join('\n');
}

/** The ids an index's text lists, by group, however the formatter laid it out. */
export function indexGroups(text: string): Record<KindFile['group'], string[]> {
  const list = (name: string) => {
    const body =
      new RegExp(`${name} = \\[([\\s\\S]*?)\\] as const`).exec(text)?.[1] ?? '';
    return [...body.matchAll(/'([^']+)'/g)].map((m) => m[1]);
  };
  return { placed: list('PLACED_KIND_IDS'), other: list('OTHER_KIND_IDS') };
}

/** Every id an index's text lists. */
export function indexIds(text: string): string[] {
  const g = indexGroups(text);
  return [...g.placed, ...g.other];
}

/** A new kind's tag code, from its type's initials (codes are shared by family). */
export function deriveCode(type: string): string {
  const words = type.toUpperCase().match(/[A-Z0-9]+/g) ?? ['K'];
  const code = words
    .map((w) => w[0])
    .join('')
    .slice(0, 3);
  return /^[A-Z]/.test(code) ? code : `K${code}`.slice(0, 4);
}

/**
 * The command's field edits (`set <kind> field=value`): the value parsed
 * for its field. Returns the new file, or a problem.
 */
export function setField(
  kind: string,
  f: KindFile,
  field: string,
  value: string,
): KindFile | Problem {
  const v = value.trim();
  switch (field) {
    case 'type':
    case 'purpose':
      return { ...f, [field]: v };
    case 'code':
      return { ...f, code: v.toUpperCase() };
    case 'class':
      return { ...f, class: v as Classification };
    case 'status':
      return { ...f, status: v as StatusPolicy };
    case 'template':
      return { ...f, template: v as DescriptionTemplate };
    case 'group':
      return { ...f, group: v as KindFile['group'] };
    case 'brand':
      return { ...f, brand: v };
    case 'traits':
      return {
        ...f,
        traits: v ? (v.split(',').map((t) => t.trim()) as Trait[]).sort() : [],
      };
    case 'mount': {
      const [on, face] = v.split(':');
      if (!on || !face)
        return { kind, field, message: 'is written on:face, e.g. floor:-y' };
      return { ...f, mount: { on: on as MountOn, face: face as Face } };
    }
    case 'sources':
      return { ...f, sources: v ? v.split(',').map((s) => s.trim()) : [] };
    default:
      return {
        kind,
        field,
        message: `cannot be set; settable: type, purpose, code, class, status, template, group, brand, traits, mount, sources`,
      };
  }
}

export const isProblem = (x: KindFile | Problem): x is Problem =>
  'message' in x;

/**
 * The registry compiled from the kind files (Vite gathers the directory
 * at build, in the dev server, the tests and the Node command): each
 * kind's file by its id. The gathering is in `kinds/index.ts`, which
 * changes whenever a kind is added or removed, so no transform cache
 * (`node_modules/.vitest-cache` keys modules by their text) can hold a
 * stale list of files.
 */
export function kindFiles(): Record<string, KindFile> {
  return Object.fromEntries(
    Object.entries(KIND_FILES as Record<string, KindFile>)
      .map(
        ([path, f]) =>
          [path.replace(/^.*\//, '').replace(/\.json$/, ''), f] as const,
      )
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );
}
