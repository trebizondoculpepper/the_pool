import { describe, expect, it } from 'vite-plus/test';
import { newWorld } from '../world';
import {
  PlantProcessHistory,
  plantProcessFacts,
  plantProcessLines,
} from './plant-process';

describe('browser plant process state', () => {
  it('shows simulation-time pool temperature and heating-valve trends', () => {
    const first = newWorld();
    const history = new PlantProcessHistory();
    history.observe(plantProcessFacts(first));
    const later = {
      ...first,
      time: first.time + 120,
      pools: {
        ...first.pools,
        pool_02: {
          ...first.pools.pool_02,
          temperature: first.pools.pool_02.temperature + 0.4,
        },
      },
      poolTemperatureControls: {
        ...first.poolTemperatureControls,
        pool_02: {
          ...first.poolTemperatureControls.pool_02!,
          valvePosition: 0.6,
        },
      },
    };
    const fact = plantProcessFacts(later);
    const trend = history.trends(fact).find((item) => item.pool === 'pool_02')!;
    expect(trend.mainPoolTemperatureCPerMinute).toBeCloseTo(0.2);
    expect(trend.temperatureControlValvePositionPerMinute).toBeCloseTo(0.3);
    expect(plantProcessLines(fact, [trend]).join('\n')).toContain(
      'actual control valve 0.0% → 60.0%',
    );
  });

  it('keeps the Olympic main pool and balance tank chemistry separate', () => {
    const world = newWorld();
    const circuit = world.treatment.circuits.pool_02;
    const changed = {
      ...world,
      treatment: {
        ...world.treatment,
        circuits: {
          ...world.treatment.circuits,
          pool_02: {
            ...circuit,
            tank: { ...circuit.tank, ph: 8.2, alkalinity: 190 },
            pool: circuit.pool.map((water, index) =>
              index === circuit.pool.length - 1
                ? { ...water, ph: 7.75, alkalinity: 125 }
                : water,
            ),
          },
        },
      },
    };
    const process = plantProcessFacts(changed);
    const olympic = process.pools.find((pool) => pool.pool === 'pool_02')!;
    expect(olympic.mainPool.ph).toBe(7.75);
    expect(olympic.mainPool.alkalinityMgL).toBe(125);
    expect(olympic.balanceTank.ph).toBe(8.2);
    expect(olympic.balanceTank.alkalinityMgL).toBe(190);
    expect(olympic.mainPool.temperatureC).toBe(
      changed.pools.pool_02.temperature,
    );
    expect(olympic.balanceTank.temperatureC).toBeNull();
    expect(olympic.temperatureControl).toMatchObject({
      controllerRef: 'PL2-TC1',
      probeRef: 'PL2-TE1',
      setpointC: changed.poolTemperatureControls.pool_02!.setpoint,
      actualValvePosition:
        changed.poolTemperatureControls.pool_02!.valvePosition,
    });
    expect(olympic.temperatureControl?.measuredTemperatureC).toBe(
      changed.pools.pool_02.temperature,
    );
    expect(plantProcessLines(process, []).join('\n')).toContain(
      'pool_02 balance tank: pH 8.200; total alkalinity 190.0 mg/L as CaCO₃',
    );
    expect(plantProcessLines(process, []).join('\n')).toContain(
      'pool_02 pool heating PL2-TC1: pool-return probe PL2-TE1',
    );
  });

  it('reports CO₂ request, delivery, isolation and heating from distinct model fields', () => {
    const world = newWorld();
    const changed = {
      ...world,
      aqualis: {
        ...world.aqualis,
        pool_02: {
          ...world.aqualis.pool_02,
          channels: {
            ...world.aqualis.pool_02.channels,
            co2: {
              ...world.aqualis.pool_02.channels.co2,
              demand: 0.8,
              demandRate: 400,
            },
          },
        },
      },
      co2: {
        ...world.co2,
        distribution: {
          ...world.co2.distribution,
          supply: { ...world.co2.distribution.supply, isolation: false },
          lineKg: 0,
        },
        dosers: {
          ...world.co2.dosers,
          plant_pool_02: {
            ...world.co2.dosers.plant_pool_02,
            asked: 400,
            delivering: 0,
            fault: 'no-supply-pressure' as const,
          },
        },
      },
      lthw: {
        ...world.lthw,
        flow: 72,
        return: 61,
        demand: 800,
        delivered: 600,
      },
    };
    const process = plantProcessFacts(changed);
    const co2 = process.pools[1].co2!;
    expect(co2.controllerRequestedGh).toBe(400);
    expect(co2.panelAskedGh).toBe(400);
    expect(co2.deliveredGh).toBe(0);
    expect(co2.supplyIsolationOpen).toBe(false);
    expect(co2.linePressureBar).toBe(0);
    expect(process.heating.headerFlowC).toBe(72);
    expect(process.heating.deliveredKw).toBe(600);
  });

  it('uses simulation time for trends, ignores pause, and resets on a new game', () => {
    const history = new PlantProcessHistory();
    const first = plantProcessFacts(newWorld());
    history.observe(first);
    const second = {
      ...first,
      worldTime: first.worldTime + 120,
      pools: first.pools.map((pool) =>
        pool.pool === 'pool_02'
          ? {
              ...pool,
              mainPool: { ...pool.mainPool, ph: pool.mainPool.ph - 0.2 },
              balanceTank: {
                ...pool.balanceTank,
                ph: pool.balanceTank.ph - 0.4,
              },
            }
          : pool,
      ),
    };
    history.observe(second);
    const trend = history.trends(second)[1];
    expect(trend.mainPoolPhPerMinute).toBeCloseTo(-0.1);
    expect(trend.balanceTankPhPerMinute).toBeCloseTo(-0.2);
    history.observe({ ...second, pools: first.pools });
    expect(history.trends(second)[1].fromSeconds).toBe(first.worldTime);
    const reset = { ...first, worldTime: first.worldTime - 1 };
    history.observe(reset);
    expect(history.trends(reset)[1].mainPoolPhPerMinute).toBeNull();
  });
});
