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
});
