import { describe, expect, it } from 'vite-plus/test';
import {
  actOnDosingPumps,
  newDosingPumps,
  pumpMost,
  stepDosingPumps,
} from './dosing-pumps';
import type { DosingPumps, PumpDemand } from './dosing-pumps';
import { POOL_IDS } from './pools';
import type { PoolId } from './pools';

const all = (h: number, a: number) =>
  Object.fromEntries(
    POOL_IDS.map((id) => [id, { hypochlorite: h, acid: a }]),
  ) as Record<PoolId, PumpDemand>;
const ALLOWED = all(1, 1);
/** `seconds` of the pumps, a tenth at a time as the world steps: litres each delivered. */
function run(
  p: DosingPumps,
  demand: Record<PoolId, PumpDemand>,
  seconds: number,
) {
  const litres = all(0, 0);
  for (let t = 0; t < seconds * 10; t++) {
    const r = stepDosingPumps(p, demand, ALLOWED, 0.1);
    p = r.pumps;
    for (const id of POOL_IDS) {
      litres[id].hypochlorite += r.rates[id].hypochlorite / 36000;
      litres[id].acid += r.rates[id].acid / 36000;
    }
  }
  return { pumps: p, litres };
}

describe('each pool’s dosing pumps in the world', () => {
  it('has one commissioned DMH in the Olympic, with the lounge DMX and the acid DDS pumps', () => {
    const p = newDosingPumps();
    expect(p.pool_01.hypochlorite.kind).toBe('solenoid');
    expect(p.pool_02.hypochlorite.kind).toBe('motor');
    expect(p.pool_02.hypochlorite.state).toMatchObject({
      strokeLength: 0.6,
      mode: 'analog',
      head: 'degassing',
    });
    expect(p.pool_02.acid.kind).toBe('stepper');
    expect(p.pool_03.hypochlorite.kind).toBe('ideal');
    expect(pumpMost('pool_02', 'hypochlorite')).toBeCloseTo(21);
  });

  it('gives the Olympic the DMH’s commissioned 12.6 l/h when fully demanded', () => {
    const r = run(newDosingPumps(), all(1, 0), 600);
    // The degassing head sends roughly 7 % of its stroke back to the tank.
    expect(r.litres.pool_02.hypochlorite).toBeGreaterThan(1.9);
    expect(r.litres.pool_02.hypochlorite).toBeLessThanOrEqual(2.1);
    expect(r.pumps.pool_02.hypochlorite.meanLh).toBeGreaterThan(11);
    // The spas' ideal heads give exactly their most.
    expect(r.litres.pool_03.hypochlorite).toBeCloseTo(0.5 / 6, 4);
  });

  it('dose nothing while not released', () => {
    const r = stepDosingPumps(newDosingPumps(), all(1, 1), {}, 60);
    for (const id of POOL_IDS)
      expect(r.rates[id]).toEqual({ hypochlorite: 0, acid: 0 });
  });

  it('turns the Olympic DMH stroke dial one local detent at a time', () => {
    const p = actOnDosingPumps(newDosingPumps(), {
      act: 'stroke',
      pool: 'pool_02',
      chemical: 'hypochlorite',
      direction: 1,
    });
    expect(p.pool_02.hypochlorite.state).toMatchObject({ strokeLength: 0.65 });
    expect(newDosingPumps().pool_02.hypochlorite.state).toMatchObject({
      strokeLength: 0.6,
    });
  });

  it('stop a gas-locked DMX on its own detection, until it is bled and acknowledged', () => {
    let p = actOnDosingPumps(newDosingPumps(), {
      act: 'gas',
      pool: 'pool_01',
      chemical: 'hypochlorite',
      ml: 1,
    });
    let r = run(p, all(1, 0), 60);
    expect(r.litres.pool_01.hypochlorite).toBe(0);
    expect(r.pumps.pool_01.hypochlorite.fault).toBe('flow');
    p = actOnDosingPumps(r.pumps, {
      act: 'bleed',
      pool: 'pool_01',
      chemical: 'hypochlorite',
      open: true,
    });
    p = actOnDosingPumps(p, {
      act: 'acknowledge',
      pool: 'pool_01',
      chemical: 'hypochlorite',
    });
    p = run(p, all(1, 0), 3).pumps;
    p = actOnDosingPumps(p, {
      act: 'bleed',
      pool: 'pool_01',
      chemical: 'hypochlorite',
      open: false,
    });
    r = run(p, all(1, 0), 60);
    expect(r.pumps.pool_01.hypochlorite.fault).toBe(null);
    expect(r.litres.pool_01.hypochlorite).toBeGreaterThan(0.03);
  });
});
