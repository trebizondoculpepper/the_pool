import { describe, expect, it } from 'vite-plus/test';
import { bankContents } from '../toolkit/components/plant/logic/co2-supply';
import { applyAction, newWorld, stepWorld } from './world';

describe('CO₂ dosing in the world', () => {
  it('feeds both Trio-controlled valves from the shared low-pressure line into their pools', () => {
    let world = newWorld();
    for (const pool of ['pool_01', 'pool_02'] as const) {
      world = applyAction(world, {
        type: 'aqualis',
        pool,
        action: { act: 'selector', selector: 'hand' },
      });
      world = applyAction(world, {
        type: 'aqualis',
        pool,
        action: { act: 'hand', channel: 'co2', demand: 1 },
      });
    }
    const supply = world.co2.distribution.supply;
    const before = bankContents(supply, supply.service);
    for (let i = 0; i < 20; i++) world = stepWorld(world, 10);

    expect(world.co2.dosers.plant_pool_01.delivering).toBeGreaterThan(0);
    expect(world.co2.dosers.plant_pool_02.delivering).toBeGreaterThan(0);
    expect(
      bankContents(world.co2.distribution.supply, supply.service),
    ).toBeLessThan(before);
    expect(world.treatment.circuits.pool_01.pool[0].ph).toBeLessThan(7.3);
    expect(world.treatment.circuits.pool_02.pool[0].ph).toBeLessThan(7.3);
    world = applyAction(world, {
      type: 'co2/port',
      room: 'plant_pool_01',
      open: false,
    });
    for (let i = 0; i < 4; i++) world = stepWorld(world, 10);
    expect(world.co2.dosers.plant_pool_01.delivering).toBe(0);
    expect(world.co2.dosers.plant_pool_02.delivering).toBeGreaterThan(0);
  });

  it('works each panel’s local controls, the detectors’ ACCEPT and RESET, and the master valve', () => {
    let world = newWorld();
    world = applyAction(world, {
      type: 'co2/panel',
      room: 'plant_pool_02',
      action: { kind: 'mode', mode: 'manual' },
    });
    world = applyAction(world, {
      type: 'co2/panel',
      room: 'plant_pool_02',
      action: { kind: 'rate', gh: 800 },
    });
    expect(world.co2.dosers.plant_pool_02.mode).toBe('manual');
    expect(world.co2.dosers.plant_pool_02.manualRate).toBe(800);
    for (let i = 0; i < 6; i++) world = stepWorld(world, 10);
    expect(world.co2.dosers.plant_pool_02.delivering).toBeCloseTo(800, 0);
    // OFF from the panel stops it.
    world = applyAction(world, {
      type: 'co2/panel',
      room: 'plant_pool_02',
      action: { kind: 'mode', mode: 'off' },
    });
    for (let i = 0; i < 2; i++) world = stepWorld(world, 10);
    expect(world.co2.dosers.plant_pool_02.delivering).toBe(0);
    // A high alarm trips the master valve; RESET is refused while it holds.
    world = {
      ...world,
      co2: {
        ...world.co2,
        detectors: {
          ...world.co2.detectors,
          loading_bay: {
            ...world.co2.detectors.loading_bay,
            a2: true,
            reading: 20000,
          },
        },
      },
    };
    world = stepWorld(world, 10);
    expect(world.co2.distribution.master.tripped).toBe(true);
    const refused = applyAction(world, { type: 'co2/master', act: 'reset' });
    expect(refused.co2.distribution.master.tripped).toBe(true);
    // The air clears; the detector is reset, then the master valve.
    world = {
      ...world,
      co2: {
        ...world.co2,
        detectors: {
          ...world.co2.detectors,
          loading_bay: newWorld().co2.detectors.loading_bay,
        },
      },
    };
    world = applyAction(world, {
      type: 'co2/detector',
      room: 'loading_bay',
      act: 'reset',
    });
    world = applyAction(world, { type: 'co2/master', act: 'reset' });
    expect(world.co2.distribution.master.tripped).toBe(false);
    world = applyAction(world, { type: 'co2/master', act: 'off' });
    expect(world.co2.distribution.master.on).toBe(false);
  });
});
