import { describe, expect, test } from 'vite-plus/test';
import {
  contains,
  mediaByKind,
  serviceTraitsByKind,
  traitDetail,
  traitIndex,
  traitTree,
  traitsOfKind,
} from './trait-index';
import type { TraitContext } from './trait-index';

const ctx: TraitContext = {
  kinds: {
    'balance-tank': {
      traits: ['box-like', 'container', 'fixed', 'floor-standing', 'walkable'],
    },
    'software-box': { traits: ['boxed-item'] },
    desk: {},
    oops: { traits: ['sparkly'] },
  },
  composites: {
    'boxed-item': {
      description: 'A small carton you can pick up.',
      extends: ['holdable', 'box-like', 'floor-standing'],
    },
    'boxed-reader': {
      description: 'A boxed item to read.',
      extends: ['boxed-item', 'readable'],
    },
  },
  media: new Map([['balance-tank', ['water']]]),
};

describe('a kind’s traits', () => {
  test('named, implied (walkable → supportable) and from ports, by facet', () => {
    const t = traitsOfKind('balance-tank', ctx);
    expect(t.named).toEqual([
      'box-like',
      'container',
      'fixed',
      'floor-standing',
      'walkable',
    ]);
    expect(t.expanded.map((x) => [x.trait, x.sources[0].by])).toEqual([
      ['box-like', 'named'],
      ['supportable', 'implied'],
      ['walkable', 'named'],
      ['floor-standing', 'named'],
      ['fixed', 'named'],
      ['container', 'named'],
      ['water-fed', 'ports'],
    ]);
    expect(t.expanded.find((x) => x.trait === 'water-fed')?.sources).toEqual([
      { by: 'ports', media: ['water'] },
    ]);
  });

  test('through a composite, with the path', () => {
    const t = traitsOfKind('software-box', ctx);
    expect(t.expanded.find((x) => x.trait === 'holdable')?.sources).toEqual([
      { by: 'composite', via: ['boxed-item'] },
    ]);
    expect(t.expanded.find((x) => x.trait === 'boxed-item')?.primitive).toBe(
      false,
    );
  });

  test('a kind with none, and an unknown name (a problem, not a throw)', () => {
    expect(traitsOfKind('desk', ctx).expanded).toEqual([]);
    expect(traitsOfKind('oops', ctx).problems[0].message).toMatch(
      /not a trait/,
    );
  });
});

describe('one trait', () => {
  test('a primitive: its facet, meaning, metadata, and the kinds with it, however they got it', () => {
    const d = traitDetail('box-like', ctx);
    expect(d.kind).toBe('primitive');
    expect(d.facet).toBe('form');
    expect(d.kinds.map((k) => [k.kind, k.sources[0].by])).toEqual([
      ['balance-tank', 'named'],
      ['software-box', 'composite'],
    ]);
    expect(d.includedBy).toEqual(['boxed-item', 'boxed-reader']);
    expect(traitDetail('floor-standing', ctx).meta.map((m) => m.key)).toEqual([
      'origin',
      'base',
    ]);
    expect(traitDetail('supportable', ctx).kinds[0].sources).toEqual([
      { by: 'implied', from: 'walkable' },
    ]);
  });

  test('a composite: its tree down to primitives, its expansion, what includes it', () => {
    const d = traitDetail('boxed-reader', ctx);
    expect(d.kind).toBe('composite');
    expect(d.composedOf).toEqual(traitTree('boxed-reader', ctx.composites));
    expect(d.composedOf?.children.map((c) => c.trait)).toEqual([
      'boxed-item',
      'readable',
    ]);
    expect(d.expandsTo).toEqual([
      'box-like',
      'floor-standing',
      'holdable',
      'inspectable',
      'interactive',
      'readable',
    ]);
    expect(traitDetail('boxed-item', ctx).includedBy).toEqual(['boxed-reader']);
    expect(contains('boxed-reader', 'holdable', ctx.composites)).toBe(true);
  });

  test('a service trait is derived, and an unknown trait says so', () => {
    expect(traitDetail('water-fed', ctx).derived).toBe(true);
    expect(traitDetail('water-fed', ctx).kinds).toEqual([
      { kind: 'balance-tank', sources: [{ by: 'ports', media: ['water'] }] },
    ]);
    expect(traitDetail('sparkly', ctx).kind).toBe('unknown');
  });
});

test('the index counts kinds per trait, primitives by facet then composites', () => {
  const i = traitIndex(ctx);
  expect(i.at(-1)?.facet).toBe('composite');
  const form = i.find((g) => g.facet === 'form')!;
  expect(form.traits.find((t) => t.name === 'box-like')?.kinds).toBe(2);
  expect(form.traits.find((t) => t.name === 'cylindrical')?.kinds).toBe(0);
});

test('port media by kind from a graph, raises edges ignored', () => {
  const graph = {
    nodes: new Map([
      ['a', { kind: 'pump' }],
      ['b', { kind: 'annunciator' }],
    ]),
    edges: [
      { to: 'a', kind: 'feeds', medium: 'power' },
      { to: 'a', kind: 'connects', medium: 'water' },
      { to: 'b', kind: 'raises', medium: null },
    ],
  };
  const m = mediaByKind(graph);
  expect(m.get('pump')).toEqual(['power', 'water']);
  expect(m.has('annunciator')).toBe(false);
  expect(serviceTraitsByKind(m).get('pump')).toEqual(['powered', 'water-fed']);
});
