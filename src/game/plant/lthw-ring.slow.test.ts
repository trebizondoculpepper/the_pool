import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from '../world';
import type { World } from '../world';
import { POOL_IDS, POOL_TARGET } from './pools';
import { RING, RING_CAPACITY } from './lthw-ring';

/**
 * The LTHW ring's gameplay (mission 120): a new game's ring hot and every
 * demand met; the gas cut, the ring falling over minutes and the pools
 * over hours, and back again; demand above the supply, shared; the pumps
 * stopped; and the energy balance over a long run.
 */
const ready = advance(newWorld(), 3600, 10);
/** The ECV shut, or opened and the SSOV reset with GAS RESET. */
const gas = (w: World, open: boolean) => {
  const valve = applyAction(w, {
    type: 'boiler-gas',
    action: { act: 'ecv', open },
  });
  return open
    ? applyAction(valve, { type: 'boiler-gas', action: { act: 'reset' } })
    : valve;
};
const delivered = (w: World) =>
  Object.values(w.lthw.draws).reduce((t, q) => t + q, 0);

describe('the LTHW ring in the world', () => {
  it('starts a new game hot, every pool at temperature, its demand met', () => {
    expect(ready.lthw.flow).toBeCloseTo(RING.setpoint, 1);
    expect(ready.lthw.firing).toBe(true);
    expect(ready.lthw.delivered).toBeCloseTo(ready.lthw.demand, 3);
    expect(ready.lthw.supply).toBeCloseTo(
      ready.lthw.delivered + ready.lthw.losses,
      1,
    );
    for (const id of POOL_IDS)
      expect(ready.pools[id].temperature, id).toBeCloseTo(
        POOL_TARGET[id].temp,
        0,
      );
    expect(ready.lthw.areas.museum).toBeCloseTo(20, 0);
  });

  it('cools over minutes with the gas cut, the pools over hours, and recovers', () => {
    const cut = gas(ready, false);
    const t5 = advance(cut, 300, 10);
    const t30 = advance(t5, 1500, 10);
    // The ring a few degrees down in five minutes, far down in half an hour.
    expect(t5.lthw.supply).toBe(0);
    expect(RING.setpoint - t5.lthw.flow).toBeGreaterThan(2);
    expect(t30.lthw.flow).toBeLessThan(55);
    const h6 = advance(t30, 6 * 3600 - 1800, 30);
    // What it delivers falls with it; the spa, which cools fastest, drifts down.
    expect(delivered(h6)).toBeLessThan(0.5 * delivered(ready));
    expect(h6.pools.pool_03.temperature).toBeLessThan(
      POOL_TARGET.pool_03.temp - 2,
    );
    expect(h6.pools.pool_01.temperature).toBeLessThan(
      ready.pools.pool_01.temperature,
    );
    // The gas back: the ring hot again in half an hour, the pools back in hours.
    // At full fire (1800 kW) against every heater full on: some twenty minutes.
    const back = advance(gas(h6, true), 1800, 10);
    expect(back.lthw.flow).toBeGreaterThan(RING.setpoint - 2);
    const later = advance(back, 12 * 3600, 30);
    expect(later.pools.pool_03.temperature).toBeCloseTo(
      POOL_TARGET.pool_03.temp,
      0,
    );
  }, 30_000);

  it('carries a design day within its N+1 capacity, and falls about 2 K a minute when the gas is cut on it', () => {
    // −3 °C, the UK design day (doc/research/heat-demand.md §8, check 2–4).
    const design = advance(
      applyAction(ready, { type: 'weather/ambient', celsius: -3 }),
      24 * 3600,
      30,
    );
    expect(design.lthw.flow).toBeCloseTo(RING.setpoint, 1);
    expect(design.lthw.demand).toBeGreaterThan(650);
    expect(design.lthw.demand).toBeLessThan(850);
    expect(design.lthw.demand).toBeLessThan(5 * RING.boilerKW);
    expect(design.lthw.delivered).toBeCloseTo(design.lthw.demand, 3);
    // Its return about 72 °C at some 750 kW.
    expect(design.lthw.return).toBeGreaterThan(70);
    expect(design.lthw.return).toBeLessThan(74);
    for (const id of POOL_IDS)
      expect(design.pools[id].temperature, id).toBeCloseTo(
        POOL_TARGET[id].temp,
        0,
      );
    const minute = advance(gas(design, false), 60, 10);
    const fall = design.lthw.flow - minute.lthw.flow;
    expect(fall).toBeGreaterThan(1.6);
    expect(fall).toBeLessThan(2.6);
  }, 30_000);

  it('sags below its set point when the loads want more than the supply, and shares what there is', () => {
    // A design day after a long gas cut, every heater flat out (about
    // 1,600 kW asked), one boiler out: N+1's 1,500 kW is not enough.
    let w = advance(
      applyAction(
        gas(
          applyAction(ready, { type: 'weather/ambient', celsius: -3 }),
          false,
        ),
        { type: 'lthw/boilers', count: 5 },
      ),
      8 * 3600,
      30,
    );
    w = advance(gas(w, true), 2 * 3600, 10);
    expect(w.lthw.supply).toBeCloseTo(5 * RING.boilerKW, 0);
    expect(w.lthw.demand).toBeGreaterThan(5 * RING.boilerKW);
    expect(w.lthw.flow).toBeLessThan(RING.setpoint - 4);
    expect(w.lthw.delivered).toBeLessThan(w.lthw.demand);
    // Every heater gets some of it; the biggest, the Olympic's exchanger,
    // short of its 750 kW.
    for (const id of POOL_IDS) {
      expect(w.lthw.draws[`${id}/water`], id).toBeGreaterThan(0);
      expect(w.lthw.draws[`${id}/air`], id).toBeGreaterThan(0);
    }
    expect(w.lthw.draws.museum).toBeGreaterThan(0);
    expect(w.lthw.draws['pool_02/water']).toBeLessThan(700);
    // All six in service: the ring climbs back to its set point.
    const six = advance(
      applyAction(w, { type: 'lthw/boilers', count: 6 }),
      1800,
      10,
    );
    expect(six.lthw.flow).toBeGreaterThan(RING.setpoint - 2);
  }, 30_000);

  it('delivers nothing with its pumps stopped, though the boilers could fire', () => {
    const stopped = advance(
      applyAction(ready, { type: 'lthw/pumps', running: false }),
      60,
      10,
    );
    expect(delivered(stopped)).toBe(0);
    expect(stopped.lthw.supply).toBe(0);
    for (const id of POOL_IDS) expect(stopped.pools[id].heating, id).toBe(0);
    const started = advance(
      applyAction(stopped, { type: 'lthw/pumps', running: true }),
      60,
      10,
    );
    expect(delivered(started)).toBeGreaterThan(1);
  });

  it('balances its energy over a long run: supplied = delivered + lost + stored', () => {
    let supplied = 0;
    let given = 0;
    let lost = 0;
    const sum = (before: World, after: World) => {
      const dt = after.time - before.time;
      supplied += after.lthw.supply * dt;
      given += after.lthw.delivered * dt;
      lost += after.lthw.losses * dt;
    };
    // A day: an hour's gas cut, a cold evening, the pumps stopped a while.
    let w = advance(ready, 4 * 3600, 30, sum);
    w = advance(gas(w, false), 3600, 10, sum);
    w = advance(gas(w, true), 3600, 10, sum);
    w = advance(
      applyAction(w, { type: 'weather/ambient', celsius: 0 }),
      6 * 3600,
      30,
      sum,
    );
    w = advance(
      applyAction(w, { type: 'lthw/pumps', running: false }),
      1800,
      10,
      sum,
    );
    w = advance(
      applyAction(w, { type: 'lthw/pumps', running: true }),
      6 * 3600,
      30,
      sum,
    );
    const stored = RING_CAPACITY * (w.lthw.flow - ready.lthw.flow);
    expect(supplied).toBeGreaterThan(1e6);
    expect(Math.abs(supplied - given - lost - stored)).toBeLessThan(
      1e-6 * supplied,
    );
  }, 30_000);
});
