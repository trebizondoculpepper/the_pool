import { describe, expect, it } from 'vite-plus/test';
import { newPools, stepPools, stepPoolsWater } from './pools';
import { newPlantServices } from './services';
import type { PlantServices } from './services';

/** `days` of the pools under `plant`, a minute at a time. */
const run = (plant: PlantServices, days: number, start = newPools()) => {
  let pools = start;
  for (let t = 0; t < days * 24 * 60; t++)
    pools = stepPools(pools, plant, 60, t * 60);
  return pools;
};

describe('the pools as the world runs them', () => {
  it('hold steady, brimming, with everything on', () => {
    const pools = run(newPlantServices(), 3);
    for (const p of Object.values(pools)) {
      expect(p.level).toBeGreaterThan(0);
      expect(p.tripped).toBe(false);
    }
  });

  it('with the wet hall’s water off, trip the Olympic pool’s pumps within days and drop it below its lip', () => {
    const plant = newPlantServices();
    plant.sources.water = false;
    // Its pumps still fed: only the make-up is lost.
    const pools = run(
      {
        ...plant,
        sources: { ...plant.sources, water: true },
        feeders: { ...plant.feeders, wet_hall: false },
      },
      8,
    );
    expect(pools.pool_02.level).toBeLessThan(0);
  });

  it('stop the Olympic pool’s circulation when both its pumps are isolated, and run on either', () => {
    const plant = newPlantServices();
    const one = {
      ...plant,
      isolators: { ...plant.isolators, 'P-101A isolator': false },
    };
    expect(run(one, 0.1).pool_02.flow).toBeGreaterThan(100);
    const both = {
      ...one,
      isolators: { ...one.isolators, 'P-101B isolator': false },
    };
    expect(run(both, 0.1).pool_02.flow).toBeLessThan(10);
  });

  it('say the Olympic’s UV and ozone are out while both are isolated, for its chemistry', () => {
    // The chloramines' build-up itself is the chemistry's (mission 101,
    // `water-treatment.test.ts`); the pools tell it whether the UV is lit.
    const plant = newPlantServices();
    const off = {
      ...plant,
      isolators: {
        ...plant.isolators,
        'UV unit isolator': false,
        'Ozone generator isolator': false,
      },
    };
    const pools = newPools();
    expect(stepPoolsWater(pools, off, 1).flows.pool_02.uv).toBe(false);
    expect(stepPoolsWater(pools, plant, 1).flows.pool_02.uv).toBe(true);
  });

  it('stop the jacuzzi when its cabinet is isolated', () => {
    const plant = newPlantServices();
    const off = {
      ...plant,
      isolators: { ...plant.isolators, 'Jacuzzi cabinet isolator': false },
    };
    expect(run(off, 0.1).pool_03.flow).toBeLessThan(2);
  });

  it('routes the small tank drain to the pit and the Olympic tank drain to sewer', () => {
    const water = stepPoolsWater(
      newPools(),
      newPlantServices(),
      10,
      0,
      undefined,
      1,
      undefined,
      0,
      undefined,
      () => ({ toPool: 620, toWaste: 0, makeUpCalling: false, tankDrain: 20 }),
      undefined,
      undefined,
      undefined,
      { flowing: true, heat: true, tankDrain: true },
      { pool_03: 0, pool_04: 0 },
    );
    expect(water.flows.pool_03.pitDrain).toBeGreaterThan(0);
    expect(water.flows.pool_03.sewer).toBe(0);
    expect(water.flows.pool_02.sewer).toBeGreaterThan(0);
    expect(water.flows.pool_02.pitDrain).toBe(0);
    expect(water.backwashed).toBeCloseTo(
      Object.values(water.flows).reduce((sum, flow) => sum + flow.pit, 0),
      8,
    );
    expect(water.drained).toBeCloseTo(
      Object.values(water.flows).reduce((sum, flow) => sum + flow.sewer, 0),
      8,
    );
  });

  it('does not create a daily lumped wash when spa cabinets report zero wash', () => {
    const water = stepPoolsWater(
      newPools(),
      newPlantServices(),
      1,
      24 * 3600 - 0.5,
      undefined,
      1,
      undefined,
      0,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { pool_03: 0, pool_04: 0 },
    );
    expect(water.flows.pool_03.pitWaste).toBe(0);
    expect(water.flows.pool_04.pitWaste).toBe(0);
  });
});

describe('the pools’ heat from the LTHW ring (mission 120)', () => {
  /** Every pool a degree cold, so each heater asks its full output. */
  const cold = () => {
    const pools = newPools();
    for (const p of Object.values(pools)) {
      p.temperature -= 1;
      p.hallAir -= 1;
    }
    return pools;
  };
  const step = (ring?: { flow: number; circulating: boolean }) =>
    stepPoolsWater(
      cold(),
      newPlantServices(),
      10,
      0,
      undefined,
      1,
      undefined,
      0,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      ring,
    ).heat;
  const total = (h: ReturnType<typeof step>) =>
    Object.values(h).reduce((t, p) => t + p.water + p.air, 0);

  it('gives each pool what it asks from a hot ring, as a bottomless supply would', () => {
    const hot = step({ flow: 80, circulating: true });
    const bottomless = step();
    for (const [id, h] of Object.entries(hot)) {
      expect(h.water, id).toBeCloseTo(h.waterAsked, 6);
      expect(h.water, id).toBeCloseTo(
        bottomless[id as keyof typeof hot].water,
        6,
      );
    }
  });

  it('gives less from a cool ring, the asks unchanged', () => {
    const hot = step({ flow: 80, circulating: true });
    const cool = step({ flow: 45, circulating: true });
    expect(total(cool)).toBeLessThan(0.7 * total(hot));
    expect(cool.pool_02.waterAsked).toBeCloseTo(hot.pool_02.waterAsked, 6);
    // Below the jacuzzi's water, nothing to it.
    expect(step({ flow: 35, circulating: true }).pool_03.water).toBe(0);
  });

  it('gives nothing with the ring’s pumps stopped', () => {
    expect(total(step({ flow: 80, circulating: false }))).toBe(0);
  });
});
