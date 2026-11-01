import { describe, expect, it } from 'vite-plus/test';
import { waterFrom } from '../water/pool-chemistry';
import type { WaterSpec } from '../water/pool-chemistry';
import { deserialiseWorld } from '../save';
import { newWorld } from '../world';
import {
  CLOSED_TIMES,
  PER_VISIT,
  advise,
  reopenUnmet,
} from './aqualis-advisor';
import { actOnTrio, trioSettings } from './aqualis-world';
import type { TrioState } from './aqualis-world';
import { DEFAULT_TARGETS } from './aqualis-types';
import {
  displayModel,
  hitDisplay,
  newDisplay,
  pressDisplay,
  SETTINGS,
} from '../../toolkit/components/plant/logic/aqualis-display';
import type { DisplayInputs } from '../../toolkit/components/plant/logic/aqualis-display';
import { TRIO_CHANNELS, readingsOf } from './aqualis-advice.test-support';

/**
 * The pool OPEN or CLOSED (`doc/plans/aqualis-advice-verification.md`,
 * Part 2): the Trio's settings' switch, First Aid closing it, and what
 * Dr Aqualis may and must say either way.
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
const T = GOOD.temperature;

function advice(over: Partial<WaterSpec>, open: boolean, extra = {}) {
  const w = waterFrom({ ...GOOD, ...over });
  const r = { ...readingsOf(w, T), ...extra };
  return advise(r, trioSettings('pool_01'), TRIO_CHANNELS, w, { open });
}
const find = (a: ReturnType<typeof advice>, id: string) => {
  const x = a.find((y) => y.id === id);
  if (!x) throw new Error(`no ${id}: ${a.map((y) => y.id).join(', ')}`);
  return x;
};

describe('the pool OPEN or CLOSED, in the world', () => {
  const trio = (): TrioState => newWorld().aqualis.pool_01;
  it('a new game’s pools are open', () => {
    expect(trio().poolOpen).toBe(true);
  });
  it('the switch closes and opens it', () => {
    const shut = actOnTrio(trio(), { act: 'pool', open: false });
    expect(shut.poolOpen).toBe(false);
    expect(actOnTrio(shut, { act: 'pool', open: true }).poolOpen).toBe(true);
  });
  it('a First Aid programme that wants it closed closes it, and it stays closed while that runs', () => {
    const t = actOnTrio(trio(), { act: 'firstAid', programme: 'breakpoint' });
    expect(t.poolOpen).toBe(false);
    expect(actOnTrio(t, { act: 'pool', open: true }).poolOpen).toBe(false);
    const done = actOnTrio(t, { act: 'firstAid', programme: null });
    expect(actOnTrio(done, { act: 'pool', open: true }).poolOpen).toBe(true);
  });
  it('a dosing pause leaves it open', () => {
    const t = actOnTrio(trio(), { act: 'firstAid', programme: 'dosing-pause' });
    expect(t.poolOpen).toBe(true);
  });
  it('a save from before the switch loads with the pool open', () => {
    const old = newWorld();
    const { poolOpen: _, ...t } = old.aqualis.pool_01;
    const loaded = deserialiseWorld(
      JSON.stringify({
        format: 'pool-plant-save',
        version: 64,
        savedAt: 1,
        world: { ...old, aqualis: { ...old.aqualis, pool_01: t } },
      }),
    );
    expect(loaded.ok && loaded.world.aqualis.pool_01.poolOpen).toBe(true);
  });
});

describe('the settings screen’s OPEN · CLOSED', () => {
  const inputs = (poolOpen: boolean): DisplayInputs => ({
    readings: null,
    sample: { flowing: true, flowLh: 30, lostFor: 0 },
    selector: 'auto',
    channels: Object.fromEntries(
      TRIO_CHANNELS.map((c) => [c.id, c]),
    ) as DisplayInputs['channels'],
    inhibit: null,
    advice: [],
    alarms: [],
    settings: trioSettings('pool_01'),
    hand: { hypochlorite: 0, acid: 0, co2: 0 },
    poolOpen,
  });
  it('is on the Pool dynamics tab, and a press turns it over', () => {
    const s = { ...newDisplay(), page: 'settings' as const };
    const p = SETTINGS.pool;
    const id = hitDisplay(s, inputs(true), p.x + 5, p.y + 5);
    expect(id).toBe('pool');
    expect(pressDisplay(s, inputs(true), 'pool').effect).toEqual({
      kind: 'pool',
      open: false,
    });
    expect(pressDisplay(s, inputs(false), 'pool').effect).toEqual({
      kind: 'pool',
      open: true,
    });
    expect(displayModel(s, inputs(false)).settings.poolOpen).toBe(false);
  });
});

describe('Dr Aqualis, the pool closed', () => {
  it('may dose straight into the pool, and twice as much at a visit', () => {
    const open = find(advice({ alkalinity: 20 }, true), 'alkalinity-low');
    const shut = find(advice({ alkalinity: 20 }, false), 'alkalinity-low');
    expect(open.where).toBe('balance-tank');
    expect(shut.where).toBe('pool');
    expect(shut.dose!.amount).toBeCloseTo(open.dose!.amount, 6);
    // Twice the alkalinity limit, and a pH swing 0.2 wider.
    expect(shut.dose!.first / open.dose!.first).toBeGreaterThan(1.5);
    expect(CLOSED_TIMES).toBe(2);
    expect(PER_VISIT.alkalinity * CLOSED_TIMES).toBe(100);
  });
  it('takes a faster pH swing by hand', () => {
    const mk = (open: boolean) =>
      find(advice({ ph: 6.7 }, open), 'ph-low').dose!.first;
    expect(mk(false)).toBeGreaterThan(mk(true) * 1.5);
  });
  it('chlorine far above its band is no alarm with nobody in the water, only a reason to stay closed', () => {
    const open = find(advice({ freeChlorine: 6 }, true), 'free-chlorine-high');
    const shut = find(advice({ freeChlorine: 6 }, false), 'free-chlorine-high');
    expect(open.severity).toBe('alarm');
    expect(shut.severity).toBe('warning');
    expect(shut.problem).toMatch(/stays closed until/);
  });
  it('says what must be true before it reopens', () => {
    const a = find(advice({ freeChlorine: 6, ph: 7.6 }, false), 'pool-closed');
    expect(a.problem).toMatch(/free chlorine 1\.00–1\.50 \(now 6\.00\)/);
    expect(a.problem).toMatch(/pH 7\.20–7\.40 \(now 7\.60\)/);
    const fit = find(advice({}, false), 'pool-closed');
    expect(fit.problem).toMatch(/fit to swim/);
    expect(fit.direction).toMatch(/may reopen/);
  });
  it('the reopening criteria: chlorine, combined chlorine, pH, and First Aid done', () => {
    const r = readingsOf(waterFrom(GOOD), T);
    expect(reopenUnmet(r, DEFAULT_TARGETS)).toEqual([]);
    expect(
      reopenUnmet({ ...r, combinedChlorine: 0.8 }, DEFAULT_TARGETS)[0],
    ).toMatch(/combined chlorine at most 0\.50/);
    expect(reopenUnmet(r, DEFAULT_TARGETS, true)).toEqual([
      'First Aid to finish',
    ]);
  });
});

describe('Dr Aqualis, the pool open', () => {
  it('superchlorination wants the pool closed first', () => {
    const a = find(
      advice({}, true, { combinedChlorine: 1.2 }),
      'combined-chlorine-high',
    );
    expect(a.direction).toMatch(/^Close the pool/);
    expect(a.dose?.how).toMatch(/^Close the pool first/);
  });
  it('says nothing about reopening', () => {
    expect(advice({}, true).some((a) => a.id === 'pool-closed')).toBe(false);
  });
});
