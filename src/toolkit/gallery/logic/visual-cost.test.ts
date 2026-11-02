import { describe, expect, it } from 'vite-plus/test';
import { overBudget, usageWeight } from './component-bench';
import {
  asBenchSample,
  budgetStatus,
  costReadout,
  costStoreKey,
  costSummary,
  loadRecord,
  parseRecord,
  recordAge,
  saveRecord,
  sortByCost,
  usageOfRooms,
  weightOf,
} from './visual-cost';
import type { CostRecord, KeyValueStore, VisualCost } from './visual-cost';

const cost = (over: Partial<VisualCost> = {}): VisualCost => ({
  drawCalls: 40,
  triangles: 12_000,
  materials: 9,
  textures: 3,
  textureBytes: 1_400_000,
  live: true,
  updateUs: 12,
  uploadsPerS: 2,
  texelsPerS: 50_000,
  ...over,
});

const memory = (): KeyValueStore & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  };
};

describe('visual cost', () => {
  it('judges a version as the benchmark judges its sample', () => {
    const c = cost({ updateUs: 500 });
    expect(budgetStatus(c, ['x']).over).toEqual(
      overBudget(asBenchSample('x', c)),
    );
    expect(budgetStatus(cost(), ['x']).state).toBe('within');
    expect(budgetStatus(c, ['nobody-lists-this']).state).toBe('over');
  });

  it('names an overrun known when KNOWN_OVER_BUDGET lists one of its ids', () => {
    const s = budgetStatus(cost({ texelsPerS: 900_000 }), [
      'nothing',
      'boiler-cascade:1',
    ]);
    expect(s.state).toBe('known');
    expect(s.why).toContain('controllers');
  });

  it('weighs copies as usageWeight does, busy rooms double', () => {
    const u = usageOfRooms(['control_room', 'plant_pool_01', 'plant_pool_01']);
    expect(u).toEqual({
      count: 3,
      busy: 1,
      rooms: ['control_room', 'plant_pool_01'],
    });
    const w = weightOf(cost(), u);
    expect(w.weight).toBe(usageWeight(u));
    expect(w.weight).toBe(4);
    expect(w.triangles).toBe(48_000);
    expect(w.drawCalls).toBe(160);
  });

  it('summarises a version in words', () => {
    expect(costSummary(cost())).toBe(
      '40 draws · 12k tris · 9 mats · 3 tex 1.40 MB · live, update 12.0 µs, 50k texels/s',
    );
    expect(costSummary(cost({ live: false }))).toMatch(/static$/);
    expect(costReadout('low', undefined)[0]).toContain('LOW');
    expect(costReadout('high', cost())[0]).toBe('HIGH 40 DRAWS 12k TRIS');
  });

  it('keeps and reads back a record, refusing malformed ones', () => {
    const store = memory();
    const record: CostRecord = {
      kind: 'weather-station',
      measuredAt: 1000,
      version: '1.2.3',
      high: cost(),
      low: cost({ live: false, drawCalls: 4 }),
    };
    expect(saveRecord(store, record)).toBe(true);
    expect(store.data.has(costStoreKey('weather-station'))).toBe(true);
    expect(loadRecord(store, 'weather-station')).toEqual(record);
    expect(loadRecord(store, 'other')).toBeNull();
    expect(parseRecord('{nope')).toBeNull();
    expect(parseRecord('{"kind":"x","measuredAt":1,"high":{}}')).toBeNull();
    const refusing: KeyValueStore = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadRecord(refusing, 'x')).toBeNull();
    expect(saveRecord(refusing, record)).toBe(false);
    expect(saveRecord(undefined, record)).toBe(false);
  });

  it('says how old a measurement is', () => {
    const now = 10 * 86400_000;
    expect(recordAge(now - 5_000, now)).toBe('just now');
    expect(recordAge(now - 5 * 60_000, now)).toBe('5 min ago');
    expect(recordAge(now - 3 * 3600_000, now)).toBe('3 h ago');
    expect(recordAge(now - 86400_000, now)).toBe('1 day ago');
    expect(recordAge(now - 2 * 86400_000, now)).toBe('2 days ago');
  });

  it('sorts kinds by cost or weight, unmeasured last in their order', () => {
    const kinds = [{ key: 'a' }, { key: 'b' }, { key: 'c' }, { key: 'd' }];
    const costs: Record<string, VisualCost> = {
      a: cost({ triangles: 100 }),
      b: cost({ triangles: 500 }),
      c: cost({ triangles: 300 }),
    };
    const rooms: Record<string, string[]> = {
      a: Array<string>(10).fill('plant_pool_01'),
      b: ['plant_pool_01'],
      c: ['wet_hall'],
    };
    const by = (s: 'name' | 'cost' | 'weight') =>
      sortByCost(
        kinds,
        s,
        (k) => costs[k.key],
        (k) => usageOfRooms(rooms[k.key] ?? []),
      ).map((k) => k.key);
    expect(by('name')).toEqual(['a', 'b', 'c', 'd']);
    expect(by('cost')).toEqual(['b', 'c', 'a', 'd']);
    expect(by('weight')).toEqual(['a', 'c', 'b', 'd']);
  });
});
