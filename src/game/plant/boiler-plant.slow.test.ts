import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from '../world';
import type { World } from '../world';
import { RING } from './lthw-ring';
import { SEQUENCER } from './boiler-sequencer';
import { boilerHouseOutput } from './boiler-plant';
import type { BoilerHouseAction } from './boiler-plant';

/**
 * The boiler house in the world (mission 121): the sequencer and the six
 * boilers' own controllers as the LTHW ring's supply, whichever room the
 * player is in. N+1 on a design day, staging one boiler at a time from a
 * cold ring, a locked-out lead passed over, and the plant stopped and
 * started from the control room.
 */
const act = (w: World, action: BoilerHouseAction) =>
  applyAction(w, { type: 'boiler-house', action });
const firing = (w: World) =>
  w.boilerHouse.boilers.filter((b) => b.code === 3).length;
const ready = advance(newWorld(), 3600, 10);

describe('the boiler house in the world', () => {
  it('starts a new game with the lead firing, and holds the ring at its set point as the load climbs', () => {
    const w = newWorld();
    expect(firing(w)).toBe(1);
    expect(boilerHouseOutput(w.boilerHouse)).toBeCloseTo(70, -1);
    expect(firing(ready)).toBe(2);
    expect(ready.lthw.flow).toBeCloseTo(RING.setpoint, 0);
    expect(ready.lthw.supply).toBeCloseTo(
      ready.lthw.delivered + ready.lthw.losses,
      -1,
    );
  });

  it('is N+1: a design day’s full load met with one boiler out', () => {
    const out = act(
      applyAction(ready, { type: 'weather/ambient', celsius: -3 }),
      { act: 'press', boiler: 0, key: 'power' },
    );
    const design = advance(out, 24 * 3600, 30);
    const seq = design.boilerHouse.sequencer;
    expect(design.lthw.demand).toBeGreaterThan(650);
    expect(design.lthw.delivered).toBeCloseTo(design.lthw.demand, 0);
    expect(design.lthw.flow).toBeGreaterThan(RING.setpoint - 1);
    expect(seq.called).not.toContain(0);
    expect(seq.lead).not.toBe(0);
    // With every heater flat out on a cold restart, five boilers give their 1,500 kW.
    expect(5 * RING.boilerKW).toBeGreaterThan(design.lthw.demand);
  }, 60_000);

  it('stages up from a cold ring one boiler at a time', () => {
    // Eight hours without gas on a design day, then the gas back.
    let w = advance(
      applyAction(
        applyAction(ready, { type: 'weather/ambient', celsius: -3 }),
        { type: 'boiler-gas', action: { act: 'ecv', open: false } },
      ),
      8 * 3600,
      30,
    );
    expect(firing(w)).toBe(0);
    expect(w.boilerHouse.boilers.every((b) => b.lockout === null)).toBe(true);
    w = applyAction(
      applyAction(w, {
        type: 'boiler-gas',
        action: { act: 'ecv', open: true },
      }),
      { type: 'boiler-gas', action: { act: 'reset' } },
    );
    const lit: number[] = [];
    let last = firing(w);
    w = advance(w, 900, 1, (_, after) => {
      const n = firing(after);
      expect(Math.abs(n - last)).toBeLessThanOrEqual(1);
      if (n > last) lit.push(after.time);
      last = n;
    });
    expect(lit).toHaveLength(6);
    for (let k = 1; k < lit.length; k++)
      expect(lit[k] - lit[k - 1]).toBeGreaterThanOrEqual(
        SEQUENCER.stageInterval,
      );
    expect(boilerHouseOutput(w.boilerHouse)).toBeCloseTo(1800, -1);
  }, 60_000);

  it('passes over a locked-out lead and promotes the next', () => {
    // B-501 leads; locked out (its flame lost three times), it is skipped.
    let w = ready;
    expect(w.boilerHouse.sequencer.lead).toBe(0);
    w = {
      ...w,
      boilerHouse: {
        ...w.boilerHouse,
        boilers: w.boilerHouse.boilers.map((b, i) =>
          i === 0 ? { ...b, lockout: 'flame-loss', code: 0, rate: 0 } : b,
        ),
      },
    };
    w = advance(w, 600, 5);
    expect(w.boilerHouse.sequencer.lead).toBe(1);
    expect(w.boilerHouse.sequencer.called).not.toContain(0);
    expect(w.lthw.flow).toBeGreaterThan(RING.setpoint - 1);
    expect(w.boilerHouse.sequencer.alarms.lockout).toBe('flashing');
    // RESET at the panel clears it, and B-501 is back in the rota.
    w = act(act(w, { act: 'reset' }), { act: 'accept' });
    w = advance(w, 10, 1);
    expect(w.boilerHouse.boilers[0].lockout).toBe(null);
    expect(w.boilerHouse.sequencer.alarms.lockout).toBe('off');
  }, 30_000);

  it('stops from the control room in AUTO, and only in AUTO', () => {
    const stopped = advance(act(ready, { act: 'run', run: false }), 120, 5);
    expect(stopped.boilerHouse.sequencer.called).toEqual([]);
    expect(stopped.lthw.supply).toBe(0);
    const hand = act(act(stopped, { act: 'enable', enable: 'hand' }), {
      act: 'run',
      run: true,
    });
    expect(hand.boilerHouse.sequencer.run).toBe(false);
    const back = advance(act(stopped, { act: 'run', run: true }), 300, 5);
    expect(back.boilerHouse.sequencer.called.length).toBeGreaterThan(0);
  }, 30_000);
});
