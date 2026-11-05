import { describe, expect, test } from 'vite-plus/test';
import { countUsage } from './component-bench';
import {
  genericName,
  isBadlyNamed,
  isDevRoom,
  kindCatalogue,
} from './kind-catalogue';
import { roomKeys } from './room-usage';

const kinds = kindCatalogue({
  exhibits: [
    { room: 'dev65', title: 'Boiler cascade manager', kind: 'cascade-manager' },
    { room: 'dev39', title: 'Heat energy mimic' },
    { room: 'dev39', title: 'Panel' },
  ],
  models: {
    'cascade-manager': {
      title: 'Cascade manager',
      reference: 'After the Hamwarmy CM6',
    },
  },
});
const kind = (key: string) => kinds.find((k) => k.key === key)!;

describe('kindCatalogue', () => {
  test('counts the equipped rooms as countUsage does', () => {
    const usage = countUsage(roomKeys());
    for (const k of kinds) {
      const expected =
        (usage.get(k.key)?.count ?? 0) +
        (usage.get(`kind:${k.key}`)?.count ?? 0);
      const layout = k.copies.filter(
        (c) => c.source === 'layout' || c.source === 'sign',
      );
      expect(layout.length, k.key).toBe(expected);
    }
  });
  test('a placed thing is named by the register, and its dev copy counted apart', () => {
    const cm = kind('cascade-manager');
    expect(cm.copies.map((c) => c.ref)).toContain('BH-CP3');
    expect(cm.usage.count).toBe(cm.usage.outsideDev + 1);
    expect(cm.usage.rooms).toEqual(['boiler_house', 'dev65']);
    expect(cm.aliases.join(' ')).toMatch(/CM6/);
  });
  test('an exhibit no kind claims is a kind of its own, flagged', () => {
    const e = kind('exhibit:heat-energy-mimic');
    expect(e.findings).toContain('no-kind');
    expect(isBadlyNamed(e.worst)).toBe(true);
    expect(kind('exhibit:panel').worst).toContain('generic-name');
  });
  test('bound pool architecture appears in its hall without a layout item', () => {
    expect(kind('pool').copies.map((c) => [c.room, c.ref, c.source])).toEqual([
      ['pool_01', 'lounge-pool', 'binding'],
      ['pool_02', 'olympic-pool', 'binding'],
    ]);
    expect(kind('footbath').copies.map((c) => c.room)).toEqual(['pool_04']);
    expect(kind('spa').copies.map((c) => c.room)).toEqual(['pool_03']);
  });
  test('decoration is exempt', () => {
    const filing = kind('filing');
    expect(filing.exempt).toBe(true);
    expect(filing.worst).toEqual([]);
  });
  test('a tag outside its room code is flagged; parts nest under their owner', () => {
    const pump = kind('pump').copies.find((c) => c.tag === 'P-101A')!;
    expect(pump.findings).toContain('tag-not-hierarchical');
    const part = kinds
      .flatMap((k) => k.copies)
      .find((c) => c.tag === 'PL4-CAB1-P1')!;
    expect(part.parent).toBe('PL4-CAB1');
  });
  test('generic names and dev rooms', () => {
    expect(genericName('Valve')).toBe(true);
    expect(genericName('PL2-P1', 'PL2-P1')).toBe(true);
    expect(genericName('Pump set', undefined, 'Pump set')).toBe(true);
    expect(genericName('Return valve')).toBe(false);
    expect(isDevRoom('dev19b')).toBe(true);
    expect(isDevRoom('dev_boiler')).toBe(true);
    expect(isDevRoom('boiler_house')).toBe(false);
  });
  test('report', () => {
    const bad = kinds.filter((k) => isBadlyNamed(k.worst));
    console.log(
      `kinds ${kinds.length}, used ${kinds.filter((k) => k.usage.count).length}, bad ${bad.length}`,
    );
    for (const k of bad)
      console.log(
        k.key,
        k.worst.join(','),
        k.copies
          .filter((c) => isBadlyNamed(c.findings))
          .slice(0, 4)
          .map((c) => `${c.room}/${c.ref} ${c.name} [${c.findings.join(',')}]`)
          .join(' ; '),
      );
    console.log(
      'no maker',
      kinds.filter((k) => k.findings.includes('no-maker')).length,
    );
  });
});

describe('architectural components (mission 127)', () => {
  test('signs are architectural, lookable and not given engineering findings', () => {
    const sign = kinds.find((k) => k.key === 'sign')!;
    expect(sign.class).toBe('architectural');
    expect(sign.exempt).toBe(false);
    expect(sign.copies.length).toBeGreaterThan(0);
    for (const c of sign.copies) {
      expect(c.look).not.toBe('none');
      expect(c.findings).not.toContain('no-tag');
      expect(c.findings).not.toContain('no-maker');
    }
    expect(kinds.find((k) => k.key === 'fire-point')?.class).toBe(
      'architectural',
    );
  });
});
