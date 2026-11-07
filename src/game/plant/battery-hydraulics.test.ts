import { describe, expect, it } from 'vite-plus/test';
import { BIG_FILTER, batteryFaceFlows } from './five-valve-filter';
import { OLYMPIC_PUMP } from './olympic-battery';
import { newSpaFilters, spaFlowShare } from './spa-filter';
import { filterSizing } from './ideal-filter';

const SERVICE = { v1: 1, v2: 1, v3: 0, v4: 0, v5: 0 };
const face = (dirtShare = 0.05, fissuring = 0) => ({
  opening: SERVICE,
  dirt: dirtShare * BIG_FILTER.dirtRef,
  fissuring,
});

describe('the Olympic battery, solved as one (#59)', () => {
  it('sends less through a fouled filter and more through the others, and less in all', () => {
    const clean = batteryFaceFlows(
      Array.from({ length: 5 }, () => face()),
      true,
      OLYMPIC_PUMP,
    );
    const fouled = batteryFaceFlows(
      [face(3), face(), face(), face(), face()],
      true,
      OLYMPIC_PUMP,
    );
    const total = (fs: typeof clean) => fs.reduce((s, f) => s + f.valve.v2, 0);
    // Its bed is a modest part of each face's loss (the return run dominates).
    expect(fouled[0].valve.v2).toBeLessThan(clean[0].valve.v2 * 0.9);
    expect(fouled[1].valve.v2).toBeGreaterThan(clean[1].valve.v2);
    expect(total(fouled)).toBeLessThan(total(clean));
    // The fouled filter's gauges read more across its bed.
    expect(fouled[0].bedBar).toBeGreaterThan(clean[0].bedBar);
  });

  it('lets a fissured bed take more than its dirt alone would', () => {
    const dirty = batteryFaceFlows(
      [face(2), face(), face(), face(), face()],
      true,
      OLYMPIC_PUMP,
    );
    const pitted = batteryFaceFlows(
      [face(2, 0.5), face(), face(), face(), face()],
      true,
      OLYMPIC_PUMP,
    );
    expect(pitted[0].valve.v2).toBeGreaterThan(dirty[0].valve.v2);
  });

  it('moves nothing with its pumps off', () => {
    for (const f of batteryFaceFlows([face(), face()], false, OLYMPIC_PUMP))
      expect(f.valve.v2).toBe(0);
  });
});

describe('a spa cabinet’s filter against its pump (#59)', () => {
  it('gives its design flow clean, less as its bed fouls, a little more fissured', () => {
    const f = newSpaFilters().pool_03;
    const ref = filterSizing(f.spec).dirtRef;
    const at = (dirt: number, fissuring = 0) =>
      spaFlowShare({ ...f, bed: { ...f.bed, dirt: dirt * ref, fissuring } });
    expect(at(0)).toBeCloseTo(1, 2);
    expect(at(1)).toBeLessThan(at(0));
    expect(at(3)).toBeLessThan(at(1));
    expect(at(1, 0.5)).toBeGreaterThan(at(1));
  });
});
