import {
  FACETS,
  FACET_RULES,
  PRIMITIVES,
  PRIMITIVE_NAMES,
  expand,
  isPrimitive,
  serviceTraits,
} from './traits';
import type {
  CompositeTrait,
  Facet,
  MetaSpec,
  Primitive,
  PrimitiveName,
  TraitProblem,
} from './traits';

/**
 * The shared trait index (mission 174): one set of pure queries the audit
 * command and the bench pages both use, so they cannot disagree: what
 * traits a kind has and how it got each, everything about one trait (its
 * meaning, what composes it, what includes it, the kinds with it), the
 * index of every trait with its use counts, and each kind's service
 * traits from the simulation graph's ports. Pure.
 */

/** How a kind has a trait. */
export type TraitSource =
  | { by: 'named' }
  | { by: 'composite'; via: string[] }
  | { by: 'implied'; from: string }
  | { by: 'ports'; media: string[] };

export interface KindTrait {
  trait: string;
  primitive: boolean;
  facet?: Facet;
  sources: TraitSource[];
}

export interface TraitTree {
  trait: string;
  primitive: boolean;
  children: TraitTree[];
}

export interface TraitContext {
  kinds: Readonly<Record<string, { traits?: readonly string[] }>>;
  composites: Readonly<Record<string, CompositeTrait>>;
  /** Each kind's port media (power, water, gas, signal …), from the simulation graph. */
  media: ReadonlyMap<string, readonly string[]>;
}

const prim = (t: PrimitiveName) => PRIMITIVES[t] as Primitive;
const facetOrder = (t: string) =>
  isPrimitive(t) ? FACETS.indexOf(prim(t).facet) : FACETS.length;

const sameSource = (a: TraitSource, b: TraitSource) =>
  JSON.stringify(a) === JSON.stringify(b);

/** A kind's traits: what it names, and the full expansion, each with how it got it. */
export function traitsOfKind(
  kind: string,
  ctx: TraitContext,
): { named: string[]; expanded: KindTrait[]; problems: TraitProblem[] } {
  const named = [...(ctx.kinds[kind]?.traits ?? [])];
  const found = new Map<string, TraitSource[]>();
  const add = (t: string, s: TraitSource) => {
    const list = found.get(t) ?? [];
    if (!list.some((x) => sameSource(x, s))) list.push(s);
    found.set(t, list);
  };
  const problems: TraitProblem[] = [];
  const walk = (t: string, via: string[], seen: Set<string>) => {
    if (seen.has(t)) {
      problems.push({
        subject: t,
        message: `cycle: ${[...via, t].join(' → ')}`,
      });
      return;
    }
    const next = new Set(seen).add(t);
    if (isPrimitive(t)) {
      for (const i of prim(t).implies ?? []) {
        add(i, { by: 'implied', from: t });
        walk(i, via, next);
      }
      return;
    }
    const c = ctx.composites[t];
    if (!c) {
      problems.push({ subject: t, message: `'${t}' is not a trait` });
      return;
    }
    for (const e of c.extends) {
      add(e, { by: 'composite', via: [...via, t] });
      walk(e, [...via, t], next);
    }
  };
  for (const t of named) {
    add(t, { by: 'named' });
    walk(t, [], new Set());
  }
  const media = [...(ctx.media.get(kind) ?? [])].sort();
  for (const s of serviceTraits(media))
    add(s, {
      by: 'ports',
      media: media.filter((m) => serviceTraits([m]).includes(s)),
    });
  const expanded = [...found]
    .map(([trait, sources]) => ({
      trait,
      primitive: isPrimitive(trait),
      ...(isPrimitive(trait) ? { facet: prim(trait).facet } : {}),
      sources,
    }))
    .sort(
      (a, b) =>
        facetOrder(a.trait) - facetOrder(b.trait) ||
        (a.trait < b.trait ? -1 : a.trait > b.trait ? 1 : 0),
    );
  return { named, expanded, problems };
}

/** A composite's tree of what it extends, down to primitives. */
export function traitTree(
  trait: string,
  composites: Readonly<Record<string, CompositeTrait>>,
  seen = new Set<string>(),
): TraitTree {
  if (isPrimitive(trait) || seen.has(trait) || !composites[trait])
    return { trait, primitive: isPrimitive(trait), children: [] };
  const next = new Set(seen).add(trait);
  return {
    trait,
    primitive: false,
    children: composites[trait].extends.map((e) =>
      traitTree(e, composites, next),
    ),
  };
}

/** Whether trait `a` contains `b` through the composites or a primitive's `implies`. */
export function contains(
  a: string,
  b: string,
  composites: Readonly<Record<string, CompositeTrait>>,
  seen = new Set<string>(),
): boolean {
  if (a === b) return true;
  if (seen.has(a)) return false;
  seen.add(a);
  if (isPrimitive(a))
    return (prim(a).implies ?? []).some((i) =>
      contains(i, b, composites, seen),
    );
  return (composites[a]?.extends ?? []).some((e) =>
    contains(e, b, composites, seen),
  );
}

export interface TraitDetail {
  name: string;
  kind: 'primitive' | 'composite' | 'unknown';
  facet?: Facet;
  facetWords?: string;
  derived?: true;
  words: string;
  meta: { key: string; spec: MetaSpec; value?: number | string }[];
  composedOf?: TraitTree;
  expandsTo: PrimitiveName[];
  implies: string[];
  conflicts: string[];
  needs?: Facet;
  includedBy: string[];
  kinds: { kind: string; sources: TraitSource[] }[];
}

/** Everything about one trait: its meaning, what composes it, what includes it, the kinds with it. */
export function traitDetail(trait: string, ctx: TraitContext): TraitDetail {
  const composite = ctx.composites[trait];
  const kinds = Object.keys(ctx.kinds)
    .sort()
    .flatMap((kind) => {
      const t = traitsOfKind(kind, ctx).expanded.find((x) => x.trait === trait);
      return t ? [{ kind, sources: t.sources }] : [];
    });
  const includedBy = Object.keys(ctx.composites)
    .filter((n) => n !== trait && contains(n, trait, ctx.composites))
    .sort();
  if (isPrimitive(trait)) {
    const p = prim(trait);
    return {
      name: trait,
      kind: 'primitive',
      facet: p.facet,
      facetWords: FACET_RULES[p.facet].words,
      ...(FACET_RULES[p.facet].derived ? { derived: true as const } : {}),
      words: p.words,
      meta: Object.entries(p.meta ?? {}).map(([key, spec]) => ({ key, spec })),
      expandsTo: expand([trait], ctx.composites).primitives,
      implies: [...(p.implies ?? [])],
      conflicts: [...(p.conflicts ?? [])],
      ...(p.needs ? { needs: p.needs } : {}),
      includedBy,
      kinds,
    };
  }
  if (composite) {
    const expandsTo = expand([trait], ctx.composites).primitives;
    const specs: Record<string, MetaSpec> = {};
    for (const p of expandsTo) Object.assign(specs, prim(p).meta ?? {});
    return {
      name: trait,
      kind: 'composite',
      words: composite.description,
      meta: Object.entries(specs).map(([key, spec]) => ({
        key,
        spec,
        ...(composite.meta?.[key] !== undefined
          ? { value: composite.meta[key] }
          : {}),
      })),
      composedOf: traitTree(trait, ctx.composites),
      expandsTo,
      implies: [],
      conflicts: [],
      includedBy,
      kinds,
    };
  }
  return {
    name: trait,
    kind: 'unknown',
    words: `'${trait}' is not a trait`,
    meta: [],
    expandsTo: [],
    implies: [],
    conflicts: [],
    includedBy: [],
    kinds: [],
  };
}

/** Every trait, primitives by facet then composites, with how many kinds have each. */
export function traitIndex(ctx: TraitContext): {
  facet: Facet | 'composite';
  words: string;
  traits: { name: string; words: string; kinds: number }[];
}[] {
  const counts = new Map<string, number>();
  for (const kind of Object.keys(ctx.kinds))
    for (const t of traitsOfKind(kind, ctx).expanded)
      counts.set(t.trait, (counts.get(t.trait) ?? 0) + 1);
  const groups: ReturnType<typeof traitIndex> = FACETS.map((facet) => ({
    facet,
    words: FACET_RULES[facet].words,
    traits: PRIMITIVE_NAMES.filter((p) => prim(p).facet === facet).map(
      (name) => ({
        name,
        words: prim(name).words,
        kinds: counts.get(name) ?? 0,
      }),
    ),
  }));
  groups.push({
    facet: 'composite',
    words: 'bundles of other traits, defined as data',
    traits: Object.keys(ctx.composites)
      .sort()
      .map((name) => ({
        name,
        words: ctx.composites[name].description,
        kinds: counts.get(name) ?? 0,
      })),
  });
  return groups;
}

/** A graph's edges, as far as service traits need them. */
export interface SimGraphLike {
  nodes:
    | ReadonlyMap<string, { kind: string }>
    | Iterable<[string, { kind: string }]>;
  edges: readonly { to: string; kind: string; medium: string | null }[];
}

/**
 * Each kind's port media from the simulation graph: the media of the edges
 * that reach its nodes (`raises` edges, alarms, ignored). Service traits
 * follow from these by `serviceTraits` (moved here from the audit command).
 */
export function mediaByKind(graph: SimGraphLike): Map<string, string[]> {
  const kindOf = new Map<string, string>();
  for (const [id, n] of graph.nodes) kindOf.set(id, n.kind);
  const media = new Map<string, Set<string>>();
  for (const e of graph.edges) {
    if (!e.medium || e.kind === 'raises') continue;
    const k = kindOf.get(e.to);
    if (!k) continue;
    media.set(k, (media.get(k) ?? new Set()).add(e.medium));
  }
  return new Map([...media].map(([k, m]) => [k, [...m].sort()]));
}

/** Each kind's service traits, from its port media. */
export const serviceTraitsByKind = (
  media: ReadonlyMap<string, readonly string[]>,
): Map<string, PrimitiveName[]> =>
  new Map([...media].map(([k, m]) => [k, serviceTraits(m)]));
