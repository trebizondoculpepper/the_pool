import { describe, expect, it } from 'vite-plus/test';
import { waterFrom } from '../water/pool-chemistry';
import type { WaterSpec } from '../water/pool-chemistry';
import { PER_VISIT, advise } from './aqualis-advisor';
import { trioSettings } from './aqualis-world';
import type { TrioPool } from './aqualis-world';
import {
  TRIO_CHANNELS,
  channelView,
  readingsOf,
  rel,
} from './aqualis-advice.test-support';

/**
 * Show dose's how and its visits (`doc/plans/aqualis-advice-verification.md`,
 * Part 1): how each dose goes in, and a dose too big for one visit split,
 * its first visit's amount given.
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

function adviceFor(
  pool: TrioPool,
  over: Partial<WaterSpec>,
  id: string,
  open = true,
  channels = TRIO_CHANNELS,
) {
  const w = waterFrom({ ...GOOD, ...over });
  const a = advise(
    readingsOf(w, GOOD.temperature),
    trioSettings(pool),
    channels,
    w,
    { open },
  ).find((x) => x.id === id);
  if (!a) throw new Error(`no ${id}`);
  return a;
}

describe('Show dose says how the dose goes in', () => {
  it('a solid: dissolved and added to the balance tank a bucket at a time', () => {
    const a = adviceFor(
      'pool_01',
      { alkalinity: 100, hardness: 90 },
      'calcium-hardness-low',
    );
    expect(a.where).toBe('balance-tank');
    expect(a.dose?.how).toMatch(/bucket at a time/);
  });
  it('the pumps’ own chemicals: leave them to work', () => {
    const a = adviceFor('pool_01', { ph: 7.5 }, 'ph-high');
    expect(a.where).toBe('automatic');
    expect(a.dose?.how).toMatch(/leave it to work/);
  });
  it('acid by hand, with its pump offline: poured slowly, acid into water', () => {
    const a = adviceFor('pool_01', { ph: 7.5 }, 'ph-high', true, [
      channelView('hypochlorite', { kind: 'online' }),
      channelView('acid', { kind: 'offline', reason: 'manual', fault: null }),
      channelView('co2', { kind: 'unconnected' }),
    ]);
    expect(a.where).toBe('balance-tank');
    expect(a.dose?.how).toMatch(/acid into water/);
  });
  it('a dilution: drained to waste and refilled at the make-up’s rate', () => {
    const a = adviceFor('pool_01', { hardness: 1100 }, 'calcium-hardness-high');
    expect(a.dose?.how).toMatch(/Drain it down/);
  });
});

describe('a dose too big for one visit is split', () => {
  it('the Lounge: alkalinity 30 → 120 is two visits of at most 50 mg/l', () => {
    const a = adviceFor('pool_01', { alkalinity: 30 }, 'alkalinity-low');
    expect(a.dose?.visits).toBe(2);
    expect(rel(a.dose!.first, (a.dose!.amount * 50) / 90)).toBeLessThan(0.02);
    expect(a.dose?.how).toMatch(/Too much at once: add .* now/);
  });
  it('the Olympic: its bicarbonate over 200 kg, split, the first visit 50 mg/l’s worth', () => {
    const a = adviceFor('pool_02', { alkalinity: 50 }, 'alkalinity-low');
    expect(a.dose!.amount).toBeGreaterThan(200);
    expect(a.dose!.visits).toBe(Math.ceil(70 / PER_VISIT.alkalinity));
    expect(
      rel(a.dose!.first, (a.dose!.amount * PER_VISIT.alkalinity) / 70),
    ).toBeLessThan(0.02);
  });
  it('a small correction is one visit, all of it', () => {
    const a = adviceFor('pool_01', { alkalinity: 78 }, 'alkalinity-low');
    expect(a.dose?.visits).toBe(1);
    expect(a.dose?.first).toBe(a.dose?.amount);
  });
});
