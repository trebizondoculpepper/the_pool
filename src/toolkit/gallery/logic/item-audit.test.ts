import { describe, expect, it } from 'vite-plus/test';
import type { CatalogueCopy } from './kind-catalogue';
import {
  DEPRECATED_KINDS,
  choiceAt,
  deprecationOf,
  groupPlacements,
  itemAuditLink,
  magicPageLink,
  magicRoomLink,
  panelChoices,
  scanMatches,
  selectorLegend,
  uncountedRooms,
} from './item-audit';

const copy = (room: string, ref: string): CatalogueCopy => ({
  room,
  kind: 'valve',
  name: ref,
  ref,
  source: 'control',
  look: 'unverified',
  exempt: false,
  findings: [],
});

describe('item audit', () => {
  it('links its pages by kind', () => {
    expect(itemAuditLink('weather-station')).toBe(
      'bench.html?bench=item-audit&kind=weather-station',
    );
    expect(magicRoomLink('a b')).toContain('kind=a%20b');
    expect(magicPageLink('pump')).toContain('bench=magic-page');
  });

  it('groups placements by room, the building first, copies in order', () => {
    const p = groupPlacements([
      copy('dev61', 'V-1'),
      copy('wet_hall', 'WH-V10'),
      copy('boiler_house', 'BH-V2'),
      copy('wet_hall', 'WH-V9'),
    ]);
    expect(p.rooms.map((r) => r.room)).toEqual([
      'boiler_house',
      'wet_hall',
      'dev61',
    ]);
    expect(p.rooms[1].copies.map((c) => c.ref)).toEqual(['WH-V9', 'WH-V10']);
    expect(p).toMatchObject({ count: 4, outsideDev: 3, inDev: 1 });
    expect(p.rooms[2].dev).toBe(true);
  });

  it('names the rooms not counted from data', () => {
    expect(uncountedRooms(['a', 'b', 'c'], ['b'])).toEqual(['a', 'c']);
  });

  it('matches a scan’s things by kind or name', () => {
    const found = scanMatches(
      [
        { ref: 'weather-station-console', name: 'Weather station console' },
        { ref: 'CR-CP10', kind: 'weather-station' },
        { ref: 'clock', name: 'Clock' },
      ],
      'weather-station',
      ['Weather station console'],
    );
    expect(found.map((t) => t.ref)).toEqual([
      'weather-station-console',
      'CR-CP10',
    ]);
  });

  it('offers a curated set, at most a selector’s four, and clamps a position', () => {
    expect(panelChoices(['a'])).toEqual([]);
    expect(panelChoices(['a', 'b', 'c', 'd', 'e'])).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
    expect(choiceAt(['a', 'b'], 5)).toBe('b');
    expect(choiceAt(['a', 'b'], -1)).toBe('a');
    expect(choiceAt([], 0)).toBeUndefined();
    expect(selectorLegend(['MAIN', 'MORE'])).toBe('MAIN · MORE');
  });

  it('keeps the deprecated kinds in data, each with a reason and replacement', () => {
    for (const d of DEPRECATED_KINDS) {
      expect(d.reason).not.toBe('');
      expect(d.replacement).not.toBe('');
    }
    const list = [{ kind: 'x', reason: 'old', replacement: 'y' }];
    expect(deprecationOf('x', list)?.replacement).toBe('y');
    expect(deprecationOf('z', list)).toBeUndefined();
  });
});
