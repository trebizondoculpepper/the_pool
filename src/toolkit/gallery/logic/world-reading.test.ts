import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from '../../../game/world';
import { plantReadingOf } from './world-reading';

describe('the plant as the world has it', () => {
  const running = advance(newWorld(), 600, 10);

  it('works out a reading once per world and pool (mission 094)', () => {
    const world = newWorld();
    const r = plantReadingOf(world, 'pool_02');
    expect(plantReadingOf(world, 'pool_02')).toBe(r);
    expect(plantReadingOf(world, 'pool_01')).not.toBe(r);
    const later = advance(world, 0.1, 0.1);
    expect(plantReadingOf(later, 'pool_02')).not.toBe(r);
  });

  it('starts every pool with treatment running and no annunciator alarms', () => {
    const world = newWorld();
    for (const pool of ['pool_01', 'pool_02', 'pool_03', 'pool_04'] as const) {
      const reading = plantReadingOf(world, pool);
      expect(reading.uvOn, pool).toBe(true);
      expect(reading.dosing, pool).toBe(true);
      expect(reading.alarms, pool).toEqual([]);
    }
  });

  it('runs the duty pump while its pool circulates, with no alarms of its own', () => {
    const r = plantReadingOf(running);
    expect(r.pumps).toEqual({ p1: true, p2: false });
    expect(r.flow).toBeGreaterThan(300);
    expect(r.uvOn).toBe(true);
    expect(r.dosing).toBe(true);
    expect(r.amps.p1).toBeGreaterThan(30);
    expect(r.alarms).not.toContain('flow-low');
    expect(r.alarms).not.toContain('p1-trip');
  });

  it('changes over to the standby pump when the duty pump is isolated', () => {
    const w = applyAction(running, {
      type: 'plant/isolator',
      name: 'P-101A isolator',
      on: false,
    });
    const r = plantReadingOf(advance(w, 60, 10));
    expect(r.pumps).toEqual({ p1: false, p2: true });
    expect(r.amps.p1).toBe(0);
  });

  it('stops both, and says so, when the plant room loses its feeder', () => {
    const w = applyAction(running, {
      type: 'plant/feeder',
      room: 'plant_pool_02',
      on: false,
    });
    const r = plantReadingOf(advance(w, 120, 10));
    expect(r.pumps).toEqual({ p1: false, p2: false });
    expect(r.alarms).toContain('flow-low');
    expect(r.uvOn).toBe(false);
  });

  it('reads the lounge’s own pumps for its plant room', () => {
    const r = plantReadingOf(running, 'pool_01');
    expect(r.pumps.p1).toBe(true);
    expect(r.flow).toBeCloseTo(running.pools.pool_01.flow, 6);
  });

  it('has the boilers not firing, and the gas windows lit, with the boiler house’s SSOV shut', () => {
    const warm = advance(
      applyAction(newWorld(), {
        type: 'pool/setpoint',
        pool: 'pool_02',
        celsius: 40,
      }),
      30,
      1,
    );
    expect(plantReadingOf(warm).boilersFiring).toBe(true);
    expect(plantReadingOf(warm).alarms).not.toContain('boiler-lockout');
    const stopped = advance(
      applyAction(warm, {
        type: 'boiler-gas',
        action: { act: 'stop', pressed: true },
      }),
      10,
      1,
    );
    const r = plantReadingOf(stopped);
    expect(r.boilersFiring).toBe(false);
    expect(r.alarms).toContain('boiler-lockout');
    const tested = applyAction(newWorld(), {
      type: 'boiler-gas',
      action: { act: 'test' },
    });
    expect(plantReadingOf(tested).alarms).toContain('gas-detected');
  });

  it('reads the LTHW ring: its flow, its return, its demand and supply (mission 120)', () => {
    const r = plantReadingOf(running);
    expect(r.lthw).toBeCloseTo(running.lthw.flow, 9);
    // Within a degree while the sequencer stages a second boiler in (mission 121).
    expect(Math.abs(r.lthw - 80)).toBeLessThan(1);
    expect(r.lthwReturn).toBeLessThan(r.lthw);
    expect(r.heatDemand).toBeGreaterThan(100);
    // The supply gives the loads' draw and the ring's losses, once the
    // boilers' sequencer has caught up with a new game's climbing load.
    const settled = advance(running, 1800, 10);
    expect(plantReadingOf(settled).heatSupply).toBeCloseTo(
      settled.lthw.delivered + settled.lthw.losses,
      -1,
    );
    expect(r.boilersFiring).toBe(true);
    // With the gas cut the ring cools and the boilers do not fire.
    const cut = advance(
      applyAction(running, {
        type: 'boiler-gas',
        action: { act: 'ecv', open: false },
      }),
      600,
      10,
    );
    const c = plantReadingOf(cut);
    expect(c.boilersFiring).toBe(false);
    expect(c.heatSupply).toBe(0);
    expect(c.lthw).toBeLessThan(75);
  });
});
