import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from '../world';
import type { World } from '../world';
import { LOUNGE_VALVES, loungeFlowsOf } from './lounge-valves';
import { LOUNGE_FILTER, loungeFilterDp } from './lounge-filters';
import { loungeFilterMimicCommand } from '../../toolkit/gallery/logic/lounge-filter-mimic';

/**
 * The lounge's filter cycle, worked from its filter mimic alone (the
 * owner, 2026-10-25): each filter backwashed and returned to service by
 * the panel's own OPEN and SHUT buttons, and left cleaner.
 */
const id = (tag: string) => LOUNGE_VALVES.find((v) => v.tag === tag)!.assetId;
const press = (w: World, tag: string, verb: 'open' | 'shut') =>
  applyAction(w, loungeFilterMimicCommand(`${id(tag)}/${verb}`)!);
const dp = (w: World) => loungeFilterDp(w.loungeFilters, loungeFlowsOf(w));

describe('the lounge’s filter cycle, from its panel', () => {
  it('starts a new game clean, well under the filter alarm, loading through the day', () => {
    const w = newWorld();
    const first = dp(advance(w, 60, 1));
    for (const d of first) expect(d).toBeLessThan(0.7 * 0.8);
    const later = advance(w, 16 * 3600, 30);
    expect(later.loungeFilters.dirt[0]).toBeGreaterThan(
      w.loungeFilters.dirt[0],
    );
    expect(Math.max(...dp(later))).toBeGreaterThan(Math.max(...first));
  });

  it('backwashes each filter in turn and leaves both cleaner', () => {
    let w = advance(newWorld(), 16 * 3600, 30);
    const before = [...w.loungeFilters.dirt];
    const dpBefore = dp(w);
    for (const n of [1, 2]) {
      w = press(press(w, `PL1-F${n}-IV1`, 'shut'), `PL1-F${n}-BV1`, 'open');
      w = advance(w, 300, 1);
      // Backwashing: the bed washed up through it, the other in service.
      // About its wash rate (34 m³/h), solved from the pump and the other
      // filter, which feeds it (#59).
      const washed = loungeFlowsOf(w).filters[n - 1];
      expect(washed).toBeLessThan(-30);
      expect(washed).toBeGreaterThan(-37);
      w = press(press(w, `PL1-F${n}-BV1`, 'shut'), `PL1-F${n}-IV1`, 'open');
      w = advance(w, 60, 1);
    }
    // Both clean again: about their design 45 each.
    for (const q of loungeFlowsOf(w).filters) expect(q).toBeCloseTo(45, 0);
    w.loungeFilters.dirt.forEach((d, i) => {
      expect(d).toBeLessThan(before[i] * 0.05);
      expect(dp(w)[i]).toBeLessThan(dpBefore[i]);
    });
    for (const d of dp(w)) expect(d).toBeCloseTo(LOUNGE_FILTER.cleanDp, 1);
  });
});
