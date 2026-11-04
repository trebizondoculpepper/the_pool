/**
 * The traits (mission 172; the owner, 2026-11-04): what a registered kind
 * is, as a small vocabulary of **primitive** traits that code gives
 * meaning to, grouped by facet, and **composite** traits, which are data
 * (`src/game/plant/traits/<trait>.ts`, mission 173) bundling primitives and other
 * composites. A kind's traits are addition only: the union of what it
 * names and what those expand to. Each primitive declares the metadata it
 * implies, with defaults, so most kinds need none. Service traits are
 * derived from the model's ports, never set by hand. Design:
 * `doc/plans/172-trait-hierarchy.md`. Pure.
 */

import { TRAIT_FILES } from './traits/index';

/** What a primitive is about. */
export type Facet =
  | 'form'
  | 'surface'
  | 'support'
  | 'connection'
  | 'handling'
  | 'use'
  | 'role'
  | 'service'
  | 'decorative';

/** How many of a facet's primitives a classified kind may have. */
export const FACET_RULES: Record<
  Facet,
  { words: string; atMost?: number; exactly?: number; derived?: true }
> = {
  form: { words: 'its shape in the world', atMost: 1 },
  surface: { words: 'what its top bears' },
  support: { words: 'what holds it up', exactly: 1 },
  connection: { words: 'how it joins the plant', atMost: 1 },
  handling: { words: 'how the player moves it', exactly: 1 },
  use: { words: 'what the player gets from it' },
  role: { words: 'what it is for' },
  service: {
    words: 'what it depends on (derived from its ports)',
    derived: true,
  },
  decorative: { words: 'seen and nothing else' },
};

export const FACETS = Object.keys(FACET_RULES) as Facet[];

/** A metadata value a primitive implies: its type and default. */
export interface MetaSpec {
  type: 'number' | 'enum' | 'text';
  values?: readonly string[];
  default?: number | string;
  words: string;
}

export interface Primitive {
  facet: Facet;
  words: string;
  /** Primitives it brings with it (walkable brings supportable). */
  implies?: readonly string[];
  /** Primitives it cannot be combined with, beyond its facet's rule. */
  conflicts?: readonly string[];
  meta?: Readonly<Record<string, MetaSpec>>;
  /** Needs one primitive of this facet as well (a surface needs a form). */
  needs?: Facet;
}

const ORIGINS = ['base', 'centre', 'top'] as const;
const AXES = ['x', 'y', 'z'] as const;
const DIRS = ['+x', '-x', '+z', '-z'] as const;

/** Every primitive trait, by name. Adding one is a code change: it is new game meaning. */
export const PRIMITIVES = {
  'box-like': { facet: 'form', words: 'its bounding box is its shape' },
  cylindrical: {
    facet: 'form',
    words:
      'a cylinder in the game world (filters, vessels): not perfect, but treated as one',
    meta: {
      axis: {
        type: 'enum',
        values: AXES,
        default: 'y',
        words: 'its axis: y upright, x or z lying down',
      },
    },
  },
  'panel-like': { facet: 'form', words: 'a thin slab: a sign, a panel’s face' },
  'run-like': {
    facet: 'form',
    words: 'a pipe, cable or duct run: walk-through',
  },
  supportable: {
    facet: 'surface',
    words: 'objects can be put on its top',
    needs: 'form',
    // How its top is found (mission 175; the owner, 2026-11-04): by casting
    // rays down on its body (the default), or a fixed plane where that is too
    // costly or misleading. Walkable inherits these through supportable.
    meta: {
      surface: {
        type: 'enum',
        values: ['raycast', 'plane'],
        default: 'raycast',
        words:
          'how its top is found: raycast (rays cast down on its body) or plane (a fixed height, surfaceY)',
      },
      surfaceY: {
        type: 'number',
        words: 'with surface=plane: its top’s height in its own frame, metres',
      },
    },
  },
  walkable: {
    facet: 'surface',
    words: 'its top bears the player',
    implies: ['supportable'],
    needs: 'form',
  },
  'floor-standing': {
    facet: 'support',
    words: 'stands on the floor',
    meta: {
      origin: {
        type: 'enum',
        values: ORIGINS,
        default: 'base',
        words:
          'where its own origin is: base (its local y = 0 plane is the floor), centre or top',
      },
      base: {
        type: 'number',
        default: 0,
        words: 'its base’s height in its own frame, metres, if not 0',
      },
    },
  },
  'wall-mounted': {
    facet: 'support',
    words: 'hangs on a wall, its back (local -z) against it',
    meta: {
      origin: {
        type: 'enum',
        values: ORIGINS,
        default: 'centre',
        words:
          'where its own origin is; its height comes from each room layout',
      },
    },
  },
  'ceiling-mounted': {
    facet: 'support',
    words: 'hangs from the ceiling, its top against it',
    meta: {
      origin: {
        type: 'enum',
        values: ORIGINS,
        default: 'top',
        words: 'where its own origin is',
      },
    },
  },
  'in-line': {
    facet: 'connection',
    words: 'sits in a pipe or cable run',
    meta: {
      runAxis: {
        type: 'enum',
        values: AXES,
        default: 'x',
        words: 'the axis along its run',
      },
    },
  },
  terminal: {
    facet: 'connection',
    words: 'ends a run: an outlet, a sink, a source',
  },
  fixed: { facet: 'handling', words: 'not moved by the player' },
  holdable: { facet: 'handling', words: 'picked up and carried' },
  luggable: {
    facet: 'handling',
    words: 'large or heavy, shifted rather than carried',
  },
  operable: { facet: 'use', words: 'has working controls' },
  sittable: {
    facet: 'use',
    words: 'something to sit on',
    meta: {
      seatHeight: {
        type: 'number',
        default: 0.45,
        words: 'its seat’s height, metres',
      },
      look: {
        type: 'enum',
        values: DIRS,
        default: '+z',
        words: 'the way a sitter looks',
      },
    },
  },
  readable: {
    facet: 'use',
    words: 'hover context: a sign, gauge or display to read',
  },
  container: {
    facet: 'role',
    words:
      'holds a stock (water, chemical, parts); storage logic may apply later',
  },
  powered: {
    facet: 'service',
    words: 'has an electrical input (derived from its ports)',
  },
  'water-fed': {
    facet: 'service',
    words: 'has a water inlet (derived from its ports)',
  },
  'gas-fed': {
    facet: 'service',
    words: 'has a gas inlet (derived from its ports)',
  },
  networked: {
    facet: 'service',
    words: 'has a signal or network port (derived from its ports)',
  },
  decorative: {
    facet: 'decorative',
    words: 'deliberately inert: seen, nothing else',
  },
} as const satisfies Record<string, Primitive>;

export type PrimitiveName = keyof typeof PRIMITIVES;
export const PRIMITIVE_NAMES = Object.keys(
  PRIMITIVES,
).sort() as PrimitiveName[];
export const isPrimitive = (t: string): t is PrimitiveName =>
  Object.hasOwn(PRIMITIVES, t);
export const primitive = (t: PrimitiveName): Primitive => PRIMITIVES[t];

/** Facets `decorative` may share a kind with. */
const DECORATIVE_WITH: readonly Facet[] = ['form', 'support', 'handling'];

/** A composite trait's file: a bundle of other traits. */
export interface CompositeTrait {
  description: string;
  extends: string[];
  /** Metadata defaults for what it contains. */
  meta?: Record<string, number | string>;
}

export interface TraitProblem {
  subject: string;
  message: string;
}

/** A trait name: lower-case words joined by hyphens. */
export const TRAIT_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Expand traits to primitives through the composites, with each step's
 * metadata. Unknown names and cycles are reported, not thrown.
 */
export function expand(
  traits: readonly string[],
  composites: Readonly<Record<string, CompositeTrait>>,
): {
  primitives: PrimitiveName[];
  problems: TraitProblem[];
  via: Record<string, string[]>;
} {
  const out = new Set<PrimitiveName>();
  const problems: TraitProblem[] = [];
  const via: Record<string, string[]> = {};
  const walk = (t: string, path: string[]) => {
    if (path.includes(t)) {
      problems.push({
        subject: t,
        message: `cycle: ${[...path, t].join(' → ')}`,
      });
      return;
    }
    if (isPrimitive(t)) {
      out.add(t);
      via[t] ??= [];
      if (path.length) via[t].push(path.join(' → '));
      for (const i of (PRIMITIVES[t] as Primitive).implies ?? [])
        walk(i, [...path, t]);
      return;
    }
    const c = composites[t];
    if (!c) {
      problems.push({ subject: t, message: `'${t}' is not a trait` });
      return;
    }
    for (const p of c.extends) walk(p, [...path, t]);
  };
  for (const t of traits) walk(t, []);
  return { primitives: [...out].sort(), problems, via };
}

/**
 * The facet rules and conflicts on a set of primitives. `complete` asks
 * for the facets a classified kind must have (support); without it a
 * missing one is not a problem (a composite need not be complete).
 */
export function primitiveProblems(
  subject: string,
  ps: readonly PrimitiveName[],
  complete = false,
): TraitProblem[] {
  const problems: TraitProblem[] = [];
  const by = (f: Facet) => ps.filter((p) => PRIMITIVES[p].facet === f);
  for (const f of FACETS) {
    const r = FACET_RULES[f];
    const n = by(f).length;
    if (r.atMost !== undefined && n > r.atMost)
      problems.push({
        subject,
        message: `more than ${r.atMost} ${f} trait: ${by(f).join(', ')}`,
      });
    if (r.exactly !== undefined && n > r.exactly)
      problems.push({
        subject,
        message: `more than ${r.exactly} ${f} trait: ${by(f).join(', ')}`,
      });
    if (complete && f === 'support' && n === 0)
      problems.push({
        subject,
        message:
          'no support trait (floor-standing, wall-mounted or ceiling-mounted)',
      });
  }
  for (const p of ps) {
    const need = (PRIMITIVES[p] as Primitive).needs;
    if (need && !by(need).length)
      problems.push({ subject, message: `${p} needs a ${need} trait` });
    for (const c of (PRIMITIVES[p] as Primitive).conflicts ?? [])
      if (ps.includes(c as PrimitiveName))
        problems.push({ subject, message: `${p} and ${c} contradict` });
  }
  if (ps.includes('decorative'))
    for (const p of ps)
      if (p !== 'decorative' && !DECORATIVE_WITH.includes(PRIMITIVES[p].facet))
        problems.push({
          subject,
          message: `decorative and ${p} contradict: decorative means seen and nothing else`,
        });
  if (ps.includes('decorative') && by('handling').some((h) => h !== 'fixed'))
    problems.push({ subject, message: 'decorative things are fixed' });
  return problems;
}

/** A kind's handling, `fixed` when it names none. */
export const handlingOf = (ps: readonly PrimitiveName[]): PrimitiveName =>
  ps.find((p) => PRIMITIVES[p].facet === 'handling') ?? 'fixed';

/** The metadata keys a set of primitives implies, with their specs. */
export function metaSpecs(
  ps: readonly PrimitiveName[],
): Record<string, MetaSpec> {
  const out: Record<string, MetaSpec> = {};
  for (const p of ps)
    Object.assign(out, (PRIMITIVES[p] as Primitive).meta ?? {});
  return out;
}

/** Whether a value suits its spec; the parsed value, or a problem. */
export function parseMeta(
  spec: MetaSpec,
  raw: string,
): number | string | { message: string } {
  if (spec.type === 'number') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : { message: `is a number, not '${raw}'` };
  }
  if (spec.type === 'enum' && !spec.values!.includes(raw))
    return { message: `is one of ${spec.values!.join(', ')}` };
  return raw;
}

/**
 * The resolved metadata: the kind's own value, else the nearest
 * composite's, else the primitive's default; with where each came from.
 * Two composites at the same depth giving different values for one key
 * is a problem unless the kind sets its own.
 */
export function resolveMeta(
  traits: readonly string[],
  own: Readonly<Record<string, number | string>>,
  composites: Readonly<Record<string, CompositeTrait>>,
): {
  values: Record<string, number | string>;
  from: Record<string, string>;
  problems: TraitProblem[];
} {
  const { primitives } = expand(traits, composites);
  const specs = metaSpecs(primitives);
  const values: Record<string, number | string> = {};
  const from: Record<string, string> = {};
  const problems: TraitProblem[] = [];
  // Composites by depth: the kind's own traits are depth 1.
  const byDepth = new Map<
    string,
    { depth: number; value: number | string; by: string }[]
  >();
  const visit = (t: string, depth: number, seen: Set<string>) => {
    if (seen.has(t)) return;
    seen.add(t);
    const c = composites[t];
    if (!c) return;
    for (const [k, v] of Object.entries(c.meta ?? {}))
      byDepth.set(k, [...(byDepth.get(k) ?? []), { depth, value: v, by: t }]);
    for (const p of c.extends) visit(p, depth + 1, seen);
  };
  for (const t of traits) visit(t, 1, new Set());
  for (const [k, spec] of Object.entries(specs)) {
    if (own[k] !== undefined) {
      values[k] = own[k];
      from[k] = 'kind';
      continue;
    }
    const offers = byDepth.get(k) ?? [];
    if (offers.length) {
      const nearest = Math.min(...offers.map((o) => o.depth));
      const at = offers.filter((o) => o.depth === nearest);
      if (new Set(at.map((o) => String(o.value))).size > 1)
        problems.push({
          subject: k,
          message: `composites ${at.map((o) => o.by).join(' and ')} give different ${k}; set it on the kind`,
        });
      values[k] = at[0].value;
      from[k] = at[0].by;
      continue;
    }
    if (spec.default !== undefined) {
      values[k] = spec.default;
      from[k] = 'default';
    }
  }
  for (const k of Object.keys(own))
    if (!specs[k])
      problems.push({
        subject: k,
        message: `no trait of this kind implies '${k}'`,
      });
  return { values, from, problems };
}

/** A composite's own problems: its name, parents, cycles, and its expansion's conflicts. */
export function compositeProblems(
  name: string,
  composites: Readonly<Record<string, CompositeTrait>>,
): TraitProblem[] {
  const c = composites[name];
  const problems: TraitProblem[] = [];
  if (!TRAIT_ID.test(name))
    problems.push({
      subject: name,
      message: 'a trait name is lower-case words joined by hyphens',
    });
  if (isPrimitive(name))
    problems.push({ subject: name, message: 'is a primitive trait already' });
  if (!c?.description?.trim())
    problems.push({ subject: name, message: 'needs a description' });
  if (!c?.extends?.length)
    problems.push({ subject: name, message: 'extends nothing' });
  for (const s of c?.extends ?? [])
    if (PRIMITIVES[s as PrimitiveName]?.facet === 'service')
      problems.push({
        subject: name,
        message: `${s} is derived from ports, never bundled`,
      });
  const e = expand([name], composites);
  problems.push(...e.problems);
  problems.push(...primitiveProblems(name, e.primitives));
  const specs = metaSpecs(e.primitives);
  for (const [k, v] of Object.entries(c?.meta ?? {})) {
    const spec = specs[k];
    if (!spec)
      problems.push({
        subject: name,
        message: `no trait it contains implies '${k}'`,
      });
    else {
      const parsed = parseMeta(spec, String(v));
      if (typeof parsed === 'object')
        problems.push({ subject: name, message: `${k} ${parsed.message}` });
    }
  }
  return problems;
}

/** A composite's fields in one order. */
export function orderedComposite(c: CompositeTrait): Record<string, unknown> {
  const ordered: Record<string, unknown> = {
    description: c.description,
    extends: [...c.extends],
  };
  if (c.meta && Object.keys(c.meta).length) ordered.meta = c.meta;
  return ordered;
}

/** A new composite's TypeScript source (mission 173): `export default defineTrait({ … })`. */
export function compositeSource(c: CompositeTrait): string {
  return [
    "import { defineTrait } from '../define-kind';",
    '',
    `export default defineTrait(${JSON.stringify(orderedComposite(c), null, 2)});`,
    '',
  ].join('\n');
}

/** The composites' index text: every composite, sorted, and the files gathered. */
export function traitIndexText(names: readonly string[]): string {
  return [
    '/**',
    ' * Every composite trait, sorted (mission 172): kept by `npm run audit --',
    ' * trait define | rename | remove` with the files beside it, never by',
    ' * hand. The files are gathered here so this file changes when they come',
    ' * or go.',
    ' */',
    'export const TRAIT_IDS = [',
    ...[...new Set(names)].sort().map((n) => `  '${n}',`),
    '] as const;',
    '',
    "export const TRAIT_FILES: Record<string, unknown> = import.meta.glob(['./*.ts', '!./index.ts'], {",
    '  eager: true,',
    "  import: 'default',",
    '});',
    '',
  ].join('\n');
}

/** The names an index's text lists. */
export function traitIndexIds(text: string): string[] {
  const body = /TRAIT_IDS = \[([\s\S]*?)\] as const/.exec(text)?.[1] ?? '';
  return [...body.matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

/** Every service trait a kind's model ports give it (mission 172: derived, never set). */
export function serviceTraits(media: Iterable<string>): PrimitiveName[] {
  const out = new Set<PrimitiveName>();
  for (const m of media) {
    if (m === 'power') out.add('powered');
    else if (m === 'water') out.add('water-fed');
    else if (m === 'gas') out.add('gas-fed');
    else if (m === 'signal') out.add('networked');
  }
  return [...out].sort();
}

/** The composite traits, from their files, by name. */
export function compositeTraits(): Record<string, CompositeTrait> {
  return Object.fromEntries(
    Object.entries(TRAIT_FILES as Record<string, CompositeTrait>)
      .map(
        ([path, c]) =>
          [path.replace(/^.*\//, '').replace(/\.(json|ts)$/, ''), c] as const,
      )
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );
}
