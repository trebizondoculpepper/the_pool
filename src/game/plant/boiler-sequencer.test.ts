import { describe, expect, it } from 'vite-plus/test';
import {
  SEQUENCER,
  acceptSequencerAlarms,
  calledBoilers,
  newBoilerSequencer,
  rotaOf,
  sequencerTargets,
  setPlantEnable,
  setPlantRun,
  stepBoilerSequencer,
} from './boiler-sequencer';
import type { BoilerSequencerState } from './boiler-sequencer';

/**
 * A toy plant for the sequencer alone: a lumped ring of the LTHW ring's
 * heat capacity, six 300 kW boilers that prove their flame ten seconds
 * after they are called (purge and ignition) and fire at their targets at
 * once, and a steady load.
 */
const CAPACITY = 5 * 4190;
interface Toy {
  s: BoilerSequencerState;
  flow: number;
  /** Seconds each boiler has been called. */
  lit: number[];
  available: boolean[];
}
const toy = (s = newBoilerSequencer(), flow = 80): Toy => ({
  s,
  flow,
  lit: [0, 0, 0, 0, 0, 0],
  available: [true, true, true, true, true, true],
});
function run(
  t: Toy,
  seconds: number,
  load: number,
  outside = 12,
  watch?: (t: Toy, time: number) => void,
): Toy {
  let { s, flow, lit } = t;
  for (let time = 0; time < seconds; time++) {
    const firing = lit.map((x) => x >= 10);
    s = stepBoilerSequencer(
      s,
      {
        flow,
        outside,
        loadCalling: load > 0,
        available: t.available,
        firing,
        lockedOut: t.available.map((a) => !a),
      },
      1,
    );
    const called = calledBoilers(s);
    lit = lit.map((x, i) => (called[i] ? x + 1 : 0));
    const targets = sequencerTargets(s);
    const supply = targets.reduce(
      (q, r, i) => q + (lit[i] >= 10 ? r * 300 : 0),
      0,
    );
    flow += (supply - load) / CAPACITY;
    watch?.({ ...t, s, flow, lit }, time);
  }
  return { ...t, s, flow, lit };
}

describe('the boiler sequencer', () => {
  it('stages up one boiler at a time, never several at once, and holds the set point', () => {
    const changes: { time: number; n: number }[] = [];
    let last = 0;
    const end = run(
      toy(newBoilerSequencer(), 70),
      3600,
      1000,
      12,
      (t, time) => {
        if (t.s.called.length !== last) {
          expect(Math.abs(t.s.called.length - last)).toBe(1);
          changes.push({ time, n: t.s.called.length });
          last = t.s.called.length;
        }
      },
    );
    // Up to four, in rota order from the lead (1000 kW is 3.3 boilers).
    expect(changes.slice(0, 4).map((c) => c.n)).toEqual([1, 2, 3, 4]);
    for (let k = 1; k < 4; k++)
      expect(changes[k].time - changes[k - 1].time).toBeGreaterThanOrEqual(
        SEQUENCER.stageInterval,
      );
    expect(end.s.called).toEqual([0, 1, 2, 3]);
    expect(end.flow).toBeCloseTo(SEQUENCER.setpoint, 1);
    expect(end.s.demand * 1800).toBeCloseTo(1000, -1);
  });

  it('fills the lead first, each called boiler at least at its minimum fire', () => {
    const s = { ...newBoilerSequencer(), called: [2, 3, 4], demand: 1.1 / 6 };
    const t = sequencerTargets(s);
    expect(t[2]).toBeCloseTo(1);
    expect(t[3]).toBe(SEQUENCER.minFire);
    expect(t[4]).toBe(SEQUENCER.minFire);
    expect(t[0]).toBe(0);
  });

  it('cycles the lead below its minimum fire, respecting its minimum run and off', () => {
    // 30 kW is half of one boiler's minimum fire (60 kW).
    const starts: number[] = [];
    const stops: number[] = [];
    let was = false;
    run(toy(), 6 * 3600, 30, 12, (t, time) => {
      const on = t.s.called.length > 0;
      if (on && !was) starts.push(time);
      if (!on && was) stops.push(time);
      was = on;
      expect(t.s.called.length).toBeLessThanOrEqual(1);
    });
    expect(starts.length).toBeGreaterThan(3);
    for (let k = 0; k < stops.length; k++)
      expect(stops[k] - starts[k]).toBeGreaterThanOrEqual(SEQUENCER.minRun);
    for (let k = 1; k < starts.length; k++)
      expect(starts[k] - stops[k - 1]).toBeGreaterThanOrEqual(SEQUENCER.minOff);
  });

  it('skips a locked-out lead and promotes the next, which takes the load', () => {
    const t = toy(newBoilerSequencer(), 78);
    t.available[0] = false;
    const end = run(t, 600, 400);
    expect(end.s.lead).toBe(1);
    expect(end.s.called[0]).toBe(1);
    expect(end.s.called).not.toContain(0);
    expect(end.flow).toBeGreaterThan(SEQUENCER.setpoint - 1);
    // A lead that locks out while firing is released at once, and the next called.
    const firing = run(toy(newBoilerSequencer(), 78), 600, 400);
    expect(firing.s.called[0]).toBe(0);
    firing.available[0] = false;
    const after = run(firing, 1, 400);
    expect(after.s.called).not.toContain(0);
    expect(after.s.lead).toBe(1);
  });

  it('rotates the lead to the boiler with fewest hours run', () => {
    const s = {
      ...newBoilerSequencer(),
      hoursRun: [100, 90, 40, 70, 60, 80],
    };
    const before = run(toy(s), 60, 200);
    expect(before.s.lead).toBe(0);
    const after = run(
      {
        ...before,
        s: { ...before.s, sinceRotation: SEQUENCER.rotationHours * 3600 },
      },
      1,
      200,
    );
    expect(after.s.lead).toBe(2);
    expect(rotaOf(2)).toEqual([2, 3, 4, 5, 0, 1]);
    // An unavailable one is passed over: the next fewest.
    const t = { ...before, s: { ...before.s, sinceRotation: 1e9 } };
    t.available = [true, true, false, true, true, true];
    expect(run(t, 1, 200).s.lead).toBe(4);
    // Fixed rotation keeps the lead where it is.
    const fixed = {
      ...before,
      s: { ...before.s, rotation: 'fixed' as const, sinceRotation: 1e9 },
    };
    expect(run(fixed, 1, 200).s.lead).toBe(0);
  });

  it('hands the load to a new lead, and sheds boilers the rest can carry', () => {
    // Four firing for a 400 kW load: two are released, one at a time.
    const busy = run(toy(newBoilerSequencer(), 70), 1200, 1000);
    expect(busy.s.called).toEqual([0, 1, 2, 3]);
    const light = run(busy, 1800, 400);
    expect(light.s.called).toEqual([0, 1]);
    expect(light.flow).toBeCloseTo(SEQUENCER.setpoint, 0);
    // Rotated to B-504, not called: it is called, and the last in its rota released.
    const rotated = run(
      {
        ...light,
        s: {
          ...light.s,
          hoursRun: [50, 50, 50, 10, 50, 50],
          sinceRotation: SEQUENCER.rotationHours * 3600,
        },
      },
      1800,
      400,
    );
    expect(rotated.s.lead).toBe(3);
    expect(rotated.s.called[0]).toBe(3);
    expect(rotated.s.called).toHaveLength(2);
    expect(sequencerTargets(rotated.s)[3]).toBe(1);
  });

  it('counts each boiler’s hours firing and its starts', () => {
    const end = run(toy(newBoilerSequencer(), 78), 3600, 200);
    expect(end.s.hoursRun[0]).toBeGreaterThan(0.9);
    expect(end.s.starts[0]).toBeGreaterThanOrEqual(1);
    expect(end.s.hoursRun[5]).toBe(0);
  });

  it('releases every boiler when no load calls, and the PI term with them', () => {
    const busy = run(toy(newBoilerSequencer(), 70), 1200, 900);
    expect(busy.s.called.length).toBeGreaterThan(2);
    const idle = run(busy, 1, 0);
    expect(idle.s.called).toEqual([]);
    expect(idle.s.wanted).toBe(false);
    expect(idle.s.demand).toBe(0);
    // In HAND it runs without a load calling; OFF and STOP release all.
    const hand = run({ ...busy, s: setPlantEnable(busy.s, 'hand') }, 1, 0);
    expect(hand.s.called.length).toBeGreaterThan(0);
    expect(
      run({ ...busy, s: setPlantEnable(busy.s, 'off') }, 1, 900).s.called,
    ).toEqual([]);
    expect(
      run({ ...busy, s: setPlantRun(busy.s, false) }, 1, 900).s.called,
    ).toEqual([]);
  });

  it('protects against frost with the plant off: pumps below 3 °C outside, the lead below 5 °C at the header', () => {
    const off = setPlantEnable(newBoilerSequencer(), 'off');
    const mild = run(toy(off, 30), 10, 50, 8);
    expect(mild.s.frostPumps).toBe(false);
    expect(mild.s.called).toEqual([]);
    const cold = run(toy(off, 30), 10, 50, -2);
    expect(cold.s.frostPumps).toBe(true);
    expect(cold.s.called).toEqual([]);
    // The header at 4 °C: the lead fires at minimum until it is past 10 °C.
    const frozen = run(toy(off, 4), 5, 0, -5);
    expect(frozen.s.frost).toBe(true);
    expect(frozen.s.called).toEqual([0]);
    expect(sequencerTargets(frozen.s)[0]).toBe(SEQUENCER.minFire);
    const warm = run(frozen, 3600, 0, -5);
    expect(warm.s.frost).toBe(false);
    expect(warm.s.called).toEqual([]);
    expect(warm.flow).toBeGreaterThan(SEQUENCER.frostClear);
  });

  it('raises its alarms flashing, and ACCEPT holds them steady until they clear', () => {
    const t = toy(newBoilerSequencer(), 60);
    t.available = [false, false, false, false, false, false];
    const down = run(t, 2, 500);
    expect(down.s.alarms).toEqual({
      lockout: 'flashing',
      'header-low': 'flashing',
      'none-available': 'flashing',
    });
    const accepted = acceptSequencerAlarms(down.s);
    expect(accepted.alarms.lockout).toBe('steady');
    const back = run(
      { ...down, s: accepted, available: [true, true, true, true, true, true] },
      1,
      500,
    );
    expect(back.s.alarms.lockout).toBe('off');
    expect(back.s.alarms['header-low']).toBe('steady');
  });
});
