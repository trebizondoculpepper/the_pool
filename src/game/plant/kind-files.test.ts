import { describe, expect, test } from 'vite-plus/test';
import {
  KIND_ID,
  deriveCode,
  indexIds,
  indexText,
  isProblem,
  kindFileText,
  kindFiles,
  setField,
  traitProblems,
  validateKindFile,
  validateRegistry,
} from './kind-files';
import type { KindFile } from './kind-files';
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

  test('refuses an unknown brand, trait and mounting', () => {
    const f = {
      ...desk,
      brand: 'acme',
      traits: ['box-like', 'sparkly'],
      mount: { on: 'roof', face: 'up' },
    } as unknown as KindFile;
    expect(validateKindFile('desk', f).map((p) => p.field)).toEqual([
      'brand',
      'traits',
      'mount',
      'mount',
    ]);
  });
});

describe('traits', () => {
  test('decorative contradicts doing anything; portable contradicts luggable', () => {
    expect(traitProblems('x', ['decorative', 'operable']).errors).toHaveLength(
      1,
    );
    expect(
      traitProblems('x', ['decorative', 'chair-like', 'portable']).errors,
    ).toHaveLength(2);
    expect(traitProblems('x', ['portable', 'luggable']).errors).toHaveLength(1);
    expect(traitProblems('x', ['box-like', 'operable']).errors).toEqual([]);
  });

  test('decorative and box-like is odd, not refused', () => {
    const r = traitProblems('x', ['box-like', 'decorative']);
    expect(r.errors).toEqual([]);
    expect(r.odd).toHaveLength(1);
  });
});

describe('the registry', () => {
  test('codes are unique within a group, and the index matches the files', () => {
    const files = {
      desk,
      'other-desk': { ...desk, type: 'Other desk' },
      chair: { ...desk, type: 'Chair', code: 'CH', group: 'other' as const },
    };
    const problems = validateRegistry(files, ['chair', 'desk', 'stool']);
    expect(problems.map((p) => p.message)).toEqual([
      "DK is already desk's in the placed group",
      'in the index but has no file',
      'has a file but is not in the index',
    ]);
  });

  test('the repository’s kind files and index agree and are valid', () => {
    expect(validateRegistry(kindFiles(), [...KIND_IDS])).toEqual([]);
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

  test('the index round-trips, sorted and unique', () => {
    expect(indexIds(indexText(['desk', 'chair', 'desk']))).toEqual([
      'chair',
      'desk',
    ]);
    expect(indexIds("export const KIND_IDS = ['a', 'b'] as const;")).toEqual([
      'a',
      'b',
    ]);
  });

  test('set parses each field; unknown fields and bad mountings are problems', () => {
    const t = setField('desk', desk, 'traits', 'operable, box-like');
    expect(!isProblem(t) && t.traits).toEqual(['box-like', 'operable']);
    const m = setField('desk', desk, 'mount', 'floor:-y');
    expect(!isProblem(m) && m.mount).toEqual({ on: 'floor', face: '-y' });
    expect(isProblem(setField('desk', desk, 'mount', 'floor'))).toBe(true);
    expect(isProblem(setField('desk', desk, 'colour', 'red'))).toBe(true);
  });

  test('a derived code is free in its group', () => {
    expect(deriveCode('Office chair', 'other', {})).toBe('OC');
    expect(
      deriveCode('Office chair', 'other', {
        a: { ...desk, group: 'other', code: 'OC' },
      }),
    ).toBe('OF');
    expect(KIND_ID.test('office-chair')).toBe(true);
  });
});
