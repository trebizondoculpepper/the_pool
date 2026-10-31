import { describe, expect, it } from 'vite-plus/test';
import { newPlantServices } from './services';
import {
  WET_HALL_PLANT,
  actOnPitPumps,
  newWetHall,
  pitPumpsRunning,
  stepWetHall,
} from './wet-hall';
import type { PitPumps } from './wet-hall';

const plant = newPlantServices();
const both: PitPumps = {
  modes: ['auto', 'auto'],
  duty: 0,
  running: [false, false],
  boost: false,
};

describe('the backwash pit’s sump pumps', () => {
  it('runs the duty pump in AUTO when the floats call, none otherwise', () => {
    expect(pitPumpsRunning(both, true, true)).toEqual([true, false]);
    expect(pitPumpsRunning(both, false, true)).toEqual([false, false]);
    expect(pitPumpsRunning(both, true, false)).toEqual([false, false]);
  });

  it('lets the standby take the call when the duty pump is not in AUTO', () => {
    const off = actOnPitPumps(both, { act: 'mode', pump: 0, mode: 'off' });
    expect(pitPumpsRunning(off, true, true)).toEqual([false, true]);
  });

  it('runs a pump in HAND whatever the floats', () => {
    const hand = actOnPitPumps(both, { act: 'mode', pump: 1, mode: 'hand' });
    expect(pitPumpsRunning(hand, false, true)).toEqual([false, true]);
  });

  it('pressing BOOST starts both pumps above the low float and releases below it', () => {
    let s = {
      ...newWetHall(),
      backwashTank: WET_HALL_PLANT.backwashTank * 0.2,
    };
    s = { ...s, pitPumps: actOnPitPumps(s.pitPumps, { act: 'boost' }) };
    s = stepWetHall(s, plant, { drawn: 0, backwashed: 0 }, 1);
    expect(s.pitPumps.boost).toBe(true);
    expect(s.pitPumps.running).toEqual([true, true]);

    s = {
      ...s,
      backwashTank: WET_HALL_PLANT.backwashTank * 0.04,
    };
    s = stepWetHall(s, plant, { drawn: 0, backwashed: 0 }, 1);
    expect(s.pitPumps.boost).toBe(false);
    expect(s.pitPumps.running).toEqual([false, false]);
  });

  it('keeps a pump selected OFF isolated even while BOOST is active', () => {
    const off = actOnPitPumps(both, { act: 'mode', pump: 1, mode: 'off' });
    const boost = actOnPitPumps(off, { act: 'boost' });
    expect(pitPumpsRunning(boost, true, true)).toEqual([true, false]);
  });

  it('clears the pit faster than normal AUTO and returns to standby at low level', () => {
    const start = {
      ...newWetHall(),
      backwashTank: 50,
    };
    let normal = start;
    let boosted = {
      ...start,
      pitPumps: actOnPitPumps(start.pitPumps, { act: 'boost' }),
    };
    for (let minute = 0; minute < 150; minute++) {
      normal = stepWetHall(normal, plant, { drawn: 0, backwashed: 0 }, 60);
      boosted = stepWetHall(boosted, plant, { drawn: 0, backwashed: 0 }, 60);
    }
    expect(boosted.backwashTank).toBeLessThan(normal.backwashTank);
    expect(boosted.backwashTank).toBeLessThan(
      WET_HALL_PLANT.backwashTank * WET_HALL_PLANT.dischargeOff,
    );
    expect(boosted.pitPumps.boost).toBe(false);
    expect(boosted.pitPumps.running).toEqual([false, false]);
  });

  it('pumps the pit down and passes the duty to the other pump after', () => {
    let s = {
      ...newWetHall(),
      backwashTank: WET_HALL_PLANT.backwashTank * 0.6,
    };
    s = stepWetHall(s, plant, { drawn: 0, backwashed: 0 }, 1);
    expect(s.pitPumps.running).toEqual([true, false]);
    for (let t = 0; t < 12 * 3600 && s.discharging; t += 10)
      s = stepWetHall(s, plant, { drawn: 0, backwashed: 0 }, 10);
    expect(s.discharging).toBe(false);
    expect(s.pitPumps.duty).toBe(1);
  });
});
