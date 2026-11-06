import { BRANDS } from '../../toolkit/components/core/logic/brands';
import { KIND_FILES } from './kinds/index';
import {
  compositeProblems,
  expand,
  isPrimitive,
  metaSpecs,
  parseMeta,
  primitive,
  primitiveProblems,
  resolveMeta,
} from './traits';
import type { CompositeTrait } from './traits';
import type {
  Classification,
  DescriptionTemplate,
  KindAffordanceDeclaration,
  StatusPolicy,
} from './equipment-kinds';

/**
 * The object registry as one file per kind (mission 168, typed TypeScript
 * since 173; the owner, 2026-11-04): `src/game/plant/kinds/<kind>.ts`, listed by the index
 * `kinds/index.ts`. Registering a kind is adding its file, unregistering
 * removing it, and its traits, metadata and the rest are edits to that one
 * file, made only by `npm run audit -- register | set | unset |
 * unregister | bind`, never by hand. This module is the format: its
 * fields, the trait vocabulary and its consistency rules, the validator,
 * the one way a file and the index are written, and the edits the
 * commands make. The game's registry stays `equipment-kinds.ts` until
 * mission 171 migrates it. Pure.
 */

export const KIND_FILE_DIR = 'src/game/plant/kinds';
export const KIND_INDEX_FILE = `${KIND_FILE_DIR}/index.ts`;

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
  /** Its traits, primitive or composite (mission 172), addition only. */
  traits?: string[];
  /** Metadata its traits imply, where it differs from their defaults. */
  meta?: Record<string, number | string>;
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
  'meta',
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
export const listOf = (v: string) =>
  v
    ? [
        ...new Set(
          v
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        ),
      ].sort()
    : [];

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

const BRAND_IDS = new Set(BRANDS.map((b) => b.id as string));

/** One file's problems, as refused by the commands and by CI. */
export function validateKindFile(
  kind: string,
  f: KindFile,
  composites: Readonly<Record<string, CompositeTrait>> = {},
): Problem[] {
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
      if (isPrimitive(t) && primitive(t).facet === 'service')
        bad('traits', `${t} is derived from the model's ports, never set`);
    const e = expand(f.traits, composites);
    for (const q of e.problems) bad('traits', q.message);
    for (const q of primitiveProblems(kind, e.primitives))
      bad('traits', q.message);
  }
  if (f.meta !== undefined) {
    const r = resolveMeta(f.traits ?? [], f.meta, composites);
    for (const q of r.problems) bad('meta', `${q.subject}: ${q.message}`);
    const specs = metaSpecs(expand(f.traits ?? [], composites).primitives);
    for (const [k, v] of Object.entries(f.meta)) {
      const spec = specs[k];
      if (!spec) continue;
      const parsed = parseMeta(spec, String(v));
      if (typeof parsed === 'object') bad('meta', `${k} ${parsed.message}`);
    }
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
  composites: Readonly<Record<string, CompositeTrait>> = {},
): Problem[] {
  const p: Problem[] = [];
  for (const [kind, f] of Object.entries(files)) {
    p.push(...validateKindFile(kind, f, composites));
    if (!f.traits?.length)
      p.push({
        kind,
        field: 'traits',
        message:
          'a kind must have at least one trait (mission 176); give it one with `set <kind> traits=…`',
      });
  }
  for (const name of Object.keys(composites))
    for (const q of compositeProblems(name, composites))
      p.push({ kind: `trait:${name}`, message: q.message });
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
  return `${JSON.stringify(orderedKind(f), null, 2)}\n`;
}

/** A kind's fields in the one order, unset ones left out. */
export function orderedKind(f: KindFile): Record<string, unknown> {
  const ordered: Record<string, unknown> = {};
  for (const key of FIELD_ORDER)
    if (f[key] !== undefined) ordered[key] = f[key];
  return ordered;
}

/**
 * A new kind file's TypeScript source (mission 173): `export default
 * defineKind({ … })`, its fields in the one order. The command formats it
 * after writing. Existing files are edited in place through magicast, so
 * their comments survive.
 */
export function kindFileSource(f: KindFile): string {
  return [
    "import { defineKind } from '../define-kind';",
    '',
    `export default defineKind(${JSON.stringify(orderedKind(f), null, 2)});`,
    '',
  ].join('\n');
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
    "export const KIND_FILES: Record<string, unknown> = import.meta.glob(['./*.ts', '!./index.ts'], {",
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
  composites: Readonly<Record<string, CompositeTrait>> = {},
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
      return { ...f, traits: listOf(v) };
    case 'traits+':
      return {
        ...f,
        traits: [...new Set([...(f.traits ?? []), ...listOf(v)])].sort(),
      };
    case 'traits-': {
      const drop = new Set(listOf(v));
      const missing = [...drop].filter((t) => !(f.traits ?? []).includes(t));
      if (missing.length)
        return {
          kind,
          field: 'traits',
          message: `does not name ${missing.join(', ')} (inherited traits cannot be removed: traits are addition only)`,
        };
      return { ...f, traits: (f.traits ?? []).filter((t) => !drop.has(t)) };
    }
    case 'sources':
      return { ...f, sources: v ? v.split(',').map((s) => s.trim()) : [] };
    default: {
      const specs = metaSpecs(expand(f.traits ?? [], composites).primitives);
      const spec = specs[field];
      if (!spec)
        return {
          kind,
          field,
          message: `cannot be set: not a field (type, purpose, code, class, status, template, group, brand, traits, traits+, traits-, sources) nor metadata its traits imply (${Object.keys(specs).join(', ') || 'none'})`,
        };
      const parsed = parseMeta(spec, v);
      if (typeof parsed === 'object')
        return { kind, field, message: parsed.message };
      return { ...f, meta: { ...(f.meta ?? {}), [field]: parsed } };
    }
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
export function kindFiles(): Readonly<Record<string, KindFile>> {
  return COMPILED;
}

/**
 * Compiled once, when this module loads, and never again (the owner,
 * 2026-11-05: "the registry should be compiled once, and never recompiled
 * again"): the kind files are fixed at build, so every caller shares this
 * one frozen record. Changing a kind file in the dev server reloads this
 * module, and the audit command is a fresh process each run.
 */
const COMPILED: Readonly<Record<string, KindFile>> = Object.freeze(
  Object.fromEntries(
    Object.entries(KIND_FILES as Record<string, KindFile>)
      .map(
        ([path, f]) =>
          [path.replace(/^.*\//, '').replace(/\.(json|ts)$/, ''), f] as const,
      )
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  ),
);
