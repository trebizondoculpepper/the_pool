import { describe, expect, test } from 'vite-plus/test';
import {
  KIND_ID,
  deriveCode,
  indexGroups,
  indexIds,
  indexText,
  isProblem,
  kindFileText,
  kindFiles,
  setField,
  validateKindFile,
  validateRegistry,
} from './kind-files';
import type { KindFile } from './kind-files';
import { compositeTraits } from './traits';
import { KIND_IDS } from './kinds/index';
import KINDS_INDEX from './kinds/index.ts?raw';

const desk: KindFile = {
  group: 'placed',
  type: 'Desk',
  code: 'DK',
  class: 'non-plant',
  status: 'none',
  purpose: 'Somewhere to work.',
};

describe('one file', () => {
  test('a good file has no problems', () => {
    expect(validateKindFile('desk', desk)).toEqual([]);
  });

  test('refuses bad ids, fields, codes, classes and unknown keys', () => {
    const bad = {
      ...desk,
      code: 'dk',
      class: 'furniture',
      purpose: ' ',
      colour: 'beech',
    } as unknown as KindFile;
    const fields = validateKindFile('Desk Top', bad).map(
      (p) => p.field ?? 'id',
    );
    expect(fields).toEqual(['id', 'code', 'class', 'purpose', 'colour']);
  });

  test('refuses an unknown brand and trait, a set service trait and stray metadata', () => {
    const f = {
      ...desk,
      brand: 'acme',
      traits: ['box-like', 'sparkly', 'powered'],
      meta: { colour: 'red' },
    } as unknown as KindFile;
    expect(validateKindFile('desk', f).map((p) => p.field)).toEqual([
      'brand',
      'traits',
      'traits',
      'meta',
    ]);
  });
});

describe('the registry', () => {
  test('the index matches the files, each in its group', () => {
    const files = {
      desk,
      'other-desk': { ...desk, type: 'Other desk' },
      chair: { ...desk, type: 'Chair', code: 'CH', group: 'other' as const },
    };
    const problems = validateRegistry(files, {
      placed: ['desk', 'stool'],
      other: ['chair'],
    });
    expect(problems.map((p) => p.message)).toEqual([
      'in the index but has no file',
      'has a file but is not in the index',
    ]);
  });

  test('the repository’s kind files and index agree and are valid', () => {
    expect(
      validateRegistry(
        kindFiles(),
        indexGroups(KINDS_INDEX),
        compositeTraits(),
      ),
    ).toEqual([]);
    expect(indexIds(KINDS_INDEX)).toEqual([...KIND_IDS]);
  });
});

describe('writing', () => {
  test('a file is written in the one field order', () => {
    const text = kindFileText({
      purpose: 'P',
      code: 'DK',
      type: 'Desk',
      status: 'none',
      class: 'non-plant',
      group: 'placed',
      traits: ['operable'],
    });
    expect(Object.keys(JSON.parse(text))).toEqual([
      'group',
      'type',
      'code',
      'class',
      'status',
      'purpose',
      'traits',
    ]);
    expect(text.endsWith('}\n')).toBe(true);
  });

  test('the index round-trips, by group, sorted and unique', () => {
    const text = indexText([
      { id: 'desk', group: 'placed' },
      { id: 'chair', group: 'other' },
      { id: 'bin', group: 'placed' },
    ]);
    expect(indexGroups(text)).toEqual({
      placed: ['bin', 'desk'],
      other: ['chair'],
    });
    expect(indexIds(text)).toEqual(['bin', 'desk', 'chair']);
  });

  test('set parses traits, traits+ and traits-, and metadata the traits imply', () => {
    const t = setField('desk', desk, 'traits', 'operable, box-like');
    expect(!isProblem(t) && t.traits).toEqual(['box-like', 'operable']);
    const plus =
      !isProblem(t) && setField('desk', t, 'traits+', 'floor-standing');
    expect(plus && !isProblem(plus) && plus.traits).toEqual([
      'box-like',
      'floor-standing',
      'operable',
    ]);
    const minus =
      plus && !isProblem(plus) && setField('desk', plus, 'traits-', 'operable');
    expect(minus && !isProblem(minus) && minus.traits).toEqual([
      'box-like',
      'floor-standing',
    ]);
    // Inherited traits cannot be removed: addition only.
    expect(isProblem(setField('desk', desk, 'traits-', 'box-like'))).toBe(true);
    const m =
      plus && !isProblem(plus) && setField('desk', plus, 'origin', 'centre');
    expect(m && !isProblem(m) && m.meta).toEqual({ origin: 'centre' });
    expect(isProblem(setField('desk', desk, 'origin', 'centre'))).toBe(true);
    expect(isProblem(setField('desk', desk, 'colour', 'red'))).toBe(true);
  });

  test('a derived code is the type’s initials', () => {
    expect(deriveCode('Office chair')).toBe('OC');
    expect(deriveCode('Desk')).toBe('D');
    expect(KIND_ID.test('office-chair')).toBe(true);
  });
});
