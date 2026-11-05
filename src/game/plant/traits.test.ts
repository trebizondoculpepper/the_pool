import { describe, expect, test } from 'vite-plus/test';
import { affordancesFromTraits } from './equipment-kinds';
import {
  compositeProblems,
  compositeTraits,
  expand,
  primitiveProblems,
  resolveMeta,
  serviceTraits,
  traitIndexIds,
  traitIndexText,
} from './traits';
import type { CompositeTrait } from './traits';
import TRAITS_INDEX from './traits/index.ts?raw';

const composites: Record<string, CompositeTrait> = {
  'software-box': {
    description: 'A boxed software package: a small carton you can pick up.',
    extends: ['holdable', 'box-like', 'floor-standing'],
  },
  'office-chair': {
    description: 'A swivel office chair.',
    extends: ['sittable', 'luggable', 'floor-standing'],
    meta: { seatHeight: 0.47 },
  },
  'cuboid-tank': {
    description: 'A large cuboidal water tank.',
    extends: ['box-like', 'walkable', 'container', 'floor-standing', 'fixed'],
  },
  'upright-filter': {
    description: 'An upright filter vessel.',
    extends: ['cylindrical', 'floor-standing'],
    meta: { axis: 'y' },
  },
};

describe('expansion', () => {
  test('a composite expands to its primitives, implied ones included', () => {
    expect(expand(['cuboid-tank'], composites).primitives).toEqual([
      'box-like',
      'container',
      'fixed',
      'floor-standing',
      'supportable',
      'walkable',
    ]);
  });

  test('addition only: a kind’s traits are the union of what it names', () => {
    expect(expand(['software-box', 'readable'], composites).primitives).toEqual(
      ['box-like', 'floor-standing', 'holdable', 'readable'],
    );
  });

  test('unknown names and cycles are problems, not crashes', () => {
    const loop = {
      a: { description: 'a', extends: ['b'] },
      b: { description: 'b', extends: ['a'] },
    };
    expect(expand(['a'], loop).problems.map((p) => p.message)[0]).toMatch(
      /cycle/,
    );
    expect(expand(['sparkly'], {}).problems[0].message).toMatch(/not a trait/);
  });
});

describe('facet rules', () => {
  test('one form, one support, one handling; a surface needs a form', () => {
    expect(primitiveProblems('x', ['box-like', 'cylindrical']).length).toBe(1);
    expect(primitiveProblems('x', ['holdable', 'luggable']).length).toBe(1);
    expect(primitiveProblems('x', ['supportable'])[0].message).toMatch(
      /needs a form/,
    );
    expect(primitiveProblems('x', ['box-like'], true)[0].message).toMatch(
      /no support/,
    );
  });

  test('decorative is seen and nothing else', () => {
    expect(
      primitiveProblems('x', ['decorative', 'panel-like', 'wall-mounted']),
    ).toEqual([]);
    expect(primitiveProblems('x', ['decorative', 'operable']).length).toBe(1);
    expect(primitiveProblems('x', ['decorative', 'readable']).length).toBe(1);
    expect(
      primitiveProblems('x', ['decorative', 'holdable']).length,
    ).toBeGreaterThan(0);
  });

  test('an architectural water volume is enterable without a mounting support', () => {
    expect(primitiveProblems('pool', ['water-body', 'fixed'], true)).toEqual(
      [],
    );
    expect(
      primitiveProblems(
        'spa',
        ['water-body', 'cylindrical', 'floor-standing', 'fixed'],
        true,
      ),
    ).toEqual([]);
  });

  test('a composite cannot bundle a service trait or a contradiction', () => {
    const bad = {
      svc: { description: 'x', extends: ['powered'] },
      dec: { description: 'y', extends: ['decorative', 'operable'] },
    };
    expect(
      compositeProblems('svc', bad).some((p) => /derived/.test(p.message)),
    ).toBe(true);
    expect(compositeProblems('dec', bad).length).toBeGreaterThan(0);
    for (const n of Object.keys(composites))
      expect(compositeProblems(n, composites), n).toEqual([]);
  });
});

describe('metadata', () => {
  test('a floor-standing thing’s origin is its base by default: no configuration', () => {
    const r = resolveMeta(['cuboid-tank'], {}, composites);
    expect(r.values.origin).toBe('base');
    expect(r.from.origin).toBe('default');
  });

  test('kind, then nearest composite, then default', () => {
    expect(
      resolveMeta(['office-chair'], {}, composites).values.seatHeight,
    ).toBe(0.47);
    expect(
      resolveMeta(['office-chair'], { seatHeight: 0.5 }, composites).values
        .seatHeight,
    ).toBe(0.5);
    expect(
      resolveMeta(['sittable', 'floor-standing'], {}, composites).values
        .seatHeight,
    ).toBe(0.45);
  });

  test('metadata no trait implies is a problem', () => {
    expect(
      resolveMeta(['software-box'], { seatHeight: 1 }, composites).problems
        .length,
    ).toBe(1);
  });

  test('two composites at one depth disagreeing is a problem unless the kind decides', () => {
    const two = {
      a: {
        description: 'a',
        extends: ['cylindrical', 'floor-standing'],
        meta: { axis: 'y' },
      },
      b: { description: 'b', extends: ['cylindrical'], meta: { axis: 'x' } },
    };
    expect(resolveMeta(['a', 'b'], {}, two).problems.length).toBe(1);
    expect(resolveMeta(['a', 'b'], { axis: 'z' }, two).problems).toEqual([]);
  });
});

describe('the resolver: traits drive affordances', () => {
  test('a cuboid tank is solid, supportable, not portable', () => {
    expect(
      affordancesFromTraits(['cuboid-tank'], {}, composites),
    ).toMatchObject({
      interaction: 'inspect-only',
      portable: false,
      solid: true,
      surface: true,
      seat: null,
    });
  });

  test('an office chair seats, at its composite’s height; a software box is portable', () => {
    expect(
      affordancesFromTraits(['office-chair'], {}, composites).seat,
    ).toEqual({
      height: 0.47,
      lookDirection: { x: 0, z: 1 },
    });
    expect(
      affordancesFromTraits(['software-box'], {}, composites).portable,
    ).toBe(true);
    expect(
      affordancesFromTraits(
        ['run-like', 'ceiling-mounted', 'in-line'],
        {},
        composites,
      ).solid,
    ).toBe(false);
  });

  test('an architectural water volume is not a solid obstacle', () => {
    expect(affordancesFromTraits(['water-body', 'fixed'], {}, {}).solid).toBe(
      false,
    );
    expect(
      affordancesFromTraits(
        ['water-body', 'cylindrical', 'floor-standing', 'fixed'],
        {},
        {},
      ).solid,
    ).toBe(true);
  });
});

test('service traits come from port media', () => {
  expect(serviceTraits(['power', 'water', 'heat', 'signal'])).toEqual([
    'networked',
    'powered',
    'water-fed',
  ]);
});

test('the composites index round-trips and matches the repository’s files', () => {
  expect(traitIndexIds(traitIndexText(['b', 'a', 'b']))).toEqual(['a', 'b']);
  expect(traitIndexIds(TRAITS_INDEX).sort()).toEqual(
    Object.keys(compositeTraits()).sort(),
  );
});
