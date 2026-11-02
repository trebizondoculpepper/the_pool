import { describe, expect, it } from 'vite-plus/test';
import { waterFrom } from '../water/pool-chemistry';
import type { WaterSpec } from '../water/pool-chemistry';
import { advise, deviation } from './aqualis-advisor';
import type { AdviseOptions } from './aqualis-advisor';
import { trioSettings } from './aqualis-world';
import type { AqualisReadings, ChannelView } from './aqualis-types';
import {
  TRIO_CHANNELS,
  channelView,
  readingsOf,
} from './aqualis-advice.test-support';

/**
 * The ranking (`doc/plans/aqualis-advice-verification.md`, Part 3; the
 * owner, 2026-10-31): safety first, then water balance and comfort, then
 * information; within a tier the biggest difference first; a cause, and
 * alkalinity, before what they come before; superchlorination and a
 * closed pool overriding the safety tier.
 */

const GOOD: WaterSpec = {
  ph: 7.3,
  alkalinity: 120,
  hardness: 250,
  tds: 900,
  temperature: 28,
  freeChlorine: 1.3,
  sulphate: 50,
};

function ranked(
  over: Partial<WaterSpec>,
  extra: Partial<AqualisReadings> = {},
  options: AdviseOptions = {},
  channels: ChannelView[] = TRIO_CHANNELS,
) {
  const w = waterFrom({ ...GOOD, ...over });
  const r = { ...readingsOf(w, GOOD.temperature), ...extra };
  return advise(r, trioSettings('pool_01'), channels, w, options);
}
const ids = (a: ReturnType<typeof ranked>) =>
  a.filter((x) => x.tier < 3).map((x) => x.id);
const tierOf = (a: ReturnType<typeof ranked>, id: string) =>
  a.find((x) => x.id === id)?.tier;

const ACID_OFF = [
  channelView('hypochlorite', { kind: 'online' }),
  channelView('acid', { kind: 'offline', reason: 'manual', fault: null }),
  channelView('co2', { kind: 'unconnected' }),
];
const HYPO_OFF = [
  channelView('hypochlorite', {
    kind: 'offline',
    reason: 'fault',
    fault: 'E1',
  }),
  channelView('acid', { kind: 'online' }),
  channelView('co2', { kind: 'unconnected' }),
];

describe('safety first', () => {
  it('chlorine too low comes before any balance problem, however big', () => {
    const a = ranked({ freeChlorine: 0.9, hardness: 20, tds: 3000 });
    expect(ids(a)[0]).toBe('free-chlorine-low');
    expect(tierOf(a, 'free-chlorine-low')).toBe(1);
    expect(tierOf(a, 'calcium-hardness-low')).toBe(2);
  });
  it('chlorine dangerously high while open is tier 1; a little high is comfort', () => {
    expect(tierOf(ranked({ freeChlorine: 4 }), 'free-chlorine-high')).toBe(1);
    expect(tierOf(ranked({ freeChlorine: 2 }), 'free-chlorine-high')).toBe(2);
  });
  it('a pH far out is tier 1; just out, tier 2', () => {
    expect(tierOf(ranked({ ph: 7.75 }), 'ph-high')).toBe(1);
    expect(tierOf(ranked({ ph: 7.5 }), 'ph-high')).toBe(2);
    expect(tierOf(ranked({ ph: 6.9 }), 'ph-low')).toBe(1);
  });
  it('the hypochlorite offline is tier 1, and first, before the chlorine it lets fall', () => {
    const a = ranked({ freeChlorine: 0.8 }, {}, {}, HYPO_OFF);
    expect(ids(a).slice(0, 2)).toEqual([
      'hypochlorite-offline',
      'free-chlorine-low',
    ]);
    expect(tierOf(a, 'hypochlorite-offline')).toBe(1);
  });
  it('the acid offline is tier 1 while the pH is high, tier 2 otherwise', () => {
    expect(tierOf(ranked({ ph: 7.5 }, {}, {}, ACID_OFF), 'acid-offline')).toBe(
      1,
    );
    expect(tierOf(ranked({}, {}, {}, ACID_OFF), 'acid-offline')).toBe(2);
  });
});

describe('the overrides', () => {
  it('closed, high chlorine and a far pH relax to tier 2', () => {
    const a = ranked({ freeChlorine: 4, ph: 7.75 }, {}, { open: false });
    expect(tierOf(a, 'free-chlorine-high')).toBe(2);
    expect(tierOf(a, 'ph-high')).toBe(2);
  });
  it('closed, chlorine too low is still tier 1: the water must be fit to reopen', () => {
    expect(
      tierOf(
        ranked({ freeChlorine: 0.4 }, {}, { open: false }),
        'free-chlorine-low',
      ),
    ).toBe(1);
  });
  it('superchlorinating, high chlorine is intended: never tier 1', () => {
    const a = ranked({ freeChlorine: 4 }, {}, { superchlorinating: true });
    expect(tierOf(a, 'free-chlorine-high')).toBe(2);
  });
});

describe('within a tier, the biggest difference first', () => {
  it('hardness far below its band before TDS a little over', () => {
    const two = (a: ReturnType<typeof ranked>) =>
      ids(a).filter((x) => x === 'calcium-hardness-low' || x === 'tds-high');
    expect(two(ranked({ hardness: 20, tds: 1600 }))).toEqual([
      'calcium-hardness-low',
      'tds-high',
    ]);
    // And the other way round when the TDS is the further out.
    expect(two(ranked({ hardness: 95, tds: 4000 }))[0]).toBe('tds-high');
  });
  it('the size is the distance from the set point in the half-band', () => {
    expect(deviation(7.4, { set: 7.3, low: 7.2, high: 7.4 })).toBeCloseTo(1, 9);
    expect(deviation(60, { set: 120, low: 80, high: 200 })).toBeCloseTo(1.5, 9);
  });
});

describe('normal practice: alkalinity before pH', () => {
  it('alkalinity low before a pH low, even where the pH is further out', () => {
    const a = ranked({ alkalinity: 70, ph: 6.95 }, {}, {}, ACID_OFF);
    const i = ids(a);
    expect(deviation(6.95, { set: 7.3, low: 7.2, high: 7.4 })).toBeGreaterThan(
      deviation(70, { set: 120, low: 80, high: 200 }),
    );
    expect(i.indexOf('alkalinity-low')).toBeLessThan(i.indexOf('ph-low'));
    // And lifted to the pH's tier, the pH far out.
    expect(tierOf(a, 'alkalinity-low')).toBe(1);
  });
  it('the bicarbonate’s words, the pH at or above its set point: the acid pump will bring it back', () => {
    const a = ranked({ alkalinity: 70, ph: 7.35 });
    expect(a.find((x) => x.id === 'alkalinity-low')?.direction).toMatch(
      /lift the pH a little; the acid pump will bring it back down/,
    );
  });
  it('and with the acid offline: restore the pump after it', () => {
    const a = ranked({ alkalinity: 70, ph: 7.35 }, {}, {}, ACID_OFF);
    expect(a.find((x) => x.id === 'alkalinity-low')?.direction).toMatch(
      /then let the acid pump bring the pH back down once restored/,
    );
  });
  it('the pH already above its band: the bicarbonate waits for it (it would lift the pH past its alarm)', () => {
    const a = ranked({ alkalinity: 70, ph: 7.55 });
    const alk = a.find((x) => x.id === 'alkalinity-low')!;
    expect(alk.additive).toBe(null);
    expect(alk.direction).toMatch(
      /^Let the acid pump bring the pH into its band first/,
    );
  });
  it('and with the acid offline: restore the pump first, the bicarbonate after', () => {
    const a = ranked({ alkalinity: 70, ph: 7.55 }, {}, {}, ACID_OFF);
    const i = ids(a);
    expect(i.indexOf('ph-high')).toBeLessThan(i.indexOf('alkalinity-low'));
    expect(a.find((x) => x.id === 'ph-high')?.where).toBe('automatic');
    expect(a.find((x) => x.id === 'alkalinity-low')?.direction).toMatch(
      /^Restore the acid pump to lower the pH first/,
    );
  });
  it('with the pH below its set point the bicarbonate needs no warning', () => {
    const a = ranked({ alkalinity: 70, ph: 7.25 });
    expect(a.find((x) => x.id === 'alkalinity-low')?.direction).toBe(
      'Raise the alkalinity with sodium bicarbonate.',
    );
  });
});
