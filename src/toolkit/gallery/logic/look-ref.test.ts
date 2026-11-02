import { describe, expect, it } from 'vite-plus/test';
import { inferredRoom, parseLookRef, resolveLookRef, slugOf } from './look-ref';
import type { LookOwner } from './look-ref';

/** A boiler house in miniature, in scene order. */
const owners: LookOwner[] = [
  { tag: 'BH-CP3', model: { node: 'cascade' }, ancestors: [] }, // 0
  { part: { label: 'Display' }, key: 'cm6-display', ancestors: [0] }, // 1
  { part: { label: 'OK' }, key: 'cm6-ok', ancestors: [0] }, // 2
  { tag: 'BH-CP3', ancestors: [] }, // 3: another piece of it
  { tag: 'BH-MP2', ancestors: [] }, // 4
  { name: 'Valve', ancestors: [] }, // 5
  { name: 'Valve', ancestors: [] }, // 6
  { name: 'Boiler cascade manager', ancestors: [] }, // 7
  { model: { link: 'flow-1' }, ancestors: [] }, // 8: a pipe
  { model: { link: 'flow-1' }, name: 'marking', ancestors: [] }, // 9: its marking
  { part: { label: 'Lamp' }, ancestors: [4] }, // 10
  { part: { label: 'Lamp' }, ancestors: [5] }, // 11
  { name: 'Heat mimic', ancestors: [] }, // 12
  { name: 'Heat mimic', ancestors: [12] }, // 13: a piece of it, named alike
];

const resolve = (ref: string) => resolveLookRef(owners, ref, 'boiler_house');

describe('parsing refs', () => {
  it('reads parts, #n and kinds', () => {
    expect(parseLookRef('BH-CP3/display')).toMatchObject({
      base: 'BH-CP3',
      part: 'display',
      kind: 'tag-or-name',
    });
    expect(parseLookRef('Valve#2')).toMatchObject({ base: 'Valve', index: 2 });
    expect(parseLookRef('asset-1308')?.kind).toBe('asset');
    expect(parseLookRef('link:flow-1')?.kind).toBe('model');
    expect(parseLookRef('part:Lamp')?.kind).toBe('part');
    expect(parseLookRef('  ')).toBeNull();
  });

  it('slugs names', () => {
    expect(slugOf('Boiler cascade manager')).toBe('boiler-cascade-manager');
  });

  it('infers the room of a tag or asset id from the register', () => {
    expect(inferredRoom('BH-CP3')).toBe('boiler_house');
    expect(inferredRoom('bh-cp3/display')).toBe('boiler_house');
    expect(inferredRoom('Valve')).toBeNull();
  });
});

describe('resolving refs', () => {
  it('a tag, ignoring case, is every piece with it', () => {
    const r = resolve('bh-cp3');
    expect(r).toEqual({ ok: true, target: { ref: 'BH-CP3', members: [0, 3] } });
  });

  it('an asset id goes through the register to its tag', () => {
    const r = resolve('ASSET-1308');
    expect(r.ok && r.target.ref).toBe('BH-CP3');
  });

  it('a model binding is one target with its markings', () => {
    const r = resolve('link:flow-1');
    expect(r.ok && r.target.members).toEqual([8, 9]);
  });

  it('a name and its slug', () => {
    expect(resolve('Boiler cascade manager').ok).toBe(true);
    expect(resolve('boiler-cascade-manager').ok).toBe(true);
  });

  it('refuses a repeated name, listing each ref; #n picks one', () => {
    const r = resolve('valve');
    expect(r.ok).toBe(false);
    expect(!r.ok && r.matches).toEqual(['valve#1', 'valve#2']);
    const second = resolve('Valve#2');
    expect(second.ok && second.target.members).toEqual([6]);
  });

  it('a name repeated by its own pieces is one thing', () => {
    const r = resolve('Heat mimic');
    expect(r.ok && r.target.members).toEqual([12]);
  });

  it('a part by label or key, within its object', () => {
    const r = resolve('BH-CP3/display');
    expect(r.ok && r.target.part?.members).toEqual([1]);
    const k = resolve('BH-CP3/cm6-ok');
    expect(k.ok && k.target.part?.members).toEqual([2]);
    expect(resolve('BH-CP3/nothing').ok).toBe(false);
  });

  it('a part key alone; a shared part:label is ambiguous', () => {
    const r = resolve('cm6-display');
    expect(r.ok && r.target.members).toEqual([0, 3]);
    expect(r.ok && r.target.part?.members).toEqual([1]);
    expect(resolve('part:Lamp').ok).toBe(false);
  });

  it('says why not', () => {
    const unknown = resolve('BH-CP9');
    expect(!unknown.ok && unknown.reason).toMatch(
      /no 'BH-CP9' in boiler_house; nearest: BH-CP3/,
    );
    const elsewhere = resolve('CR-CP10');
    expect(!elsewhere.ok && elsewhere.reason).toMatch(/is in control_room/);
    const unmarked = resolve('BH-B1');
    expect(unmarked.ok).toBe(false);
    expect(resolveLookRef([], 'x', 'dev7')).toEqual({
      ok: false,
      reason: 'no lookable objects in dev7 yet',
    });
  });
});
