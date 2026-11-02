import { describe, expect, test } from 'vite-plus/test';
import { kindCatalogue } from './kind-catalogue';
import {
  entryFields,
  lookCatalogue,
  lookLink,
  matchesSearch,
  searchWords,
} from './look-catalogue';
import { placedRoomItems } from './room-usage';
import { INSTALLED_ASSET_IDS } from '../../../game/plant/installed-asset-ids';

const kinds = kindCatalogue({
  models: {
    'cascade-manager': {
      title: 'Cascade manager',
      reference: 'After the Hamwarmy CM6',
    },
  },
});

describe('lookCatalogue', () => {
  test('every placed thing appears once in its room with its register tag', () => {
    for (const { room, items } of placedRoomItems()) {
      const entries = lookCatalogue(room, kinds);
      for (const item of items) {
        const reg = INSTALLED_ASSET_IDS[`${room}|${item.key}|${item.label}`];
        if (!reg) continue;
        expect(entries.filter((e) => e.tag === reg.tag).length, reg.tag).toBe(
          1,
        );
      }
    }
  });
  test('tagged refs are unique within a room', () => {
    const all = lookCatalogue(undefined, kinds).filter((e) => e.tag);
    const seen = new Set<string>();
    for (const e of all) {
      const k = `${e.room}|${e.ref.toLowerCase()}`;
      expect(seen.has(k), k).toBe(false);
      seen.add(k);
    }
  });
  test('BH-CP3 is found by cm6, its tag and its asset id', () => {
    const bh = lookCatalogue('boiler_house', kinds);
    for (const q of ['cm6', 'BH-CP3', 'asset-1308']) {
      const found = bh.filter((e) =>
        matchesSearch(searchWords(q), entryFields(e)),
      );
      expect(
        found.map((e) => e.ref),
        q,
      ).toContain('BH-CP3');
    }
  });
  test('parts are listed under their owner', () => {
    const cab = lookCatalogue('plant_pool_04', kinds).find(
      (e) => e.tag === 'PL4-CAB1',
    )!;
    expect(cab.parts).toContain('PL4-CAB1-P1');
  });
  test('look links', () => {
    expect(lookLink('boiler_house', 'BH-CP3')).toBe(
      '?room=boiler_house&look=BH-CP3',
    );
    expect(lookLink('dev39', 'a b', 'left')).toBe(
      '?room=dev39&look=a+b&mode=left',
    );
  });
});
