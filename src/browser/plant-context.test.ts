import { expect, it } from 'vite-plus/test';
import { newWorld } from '../game/world';
import type { WorldStore } from '../toolkit/save/world-store';
import { createPlantContextApi } from './plant-context';

it('reads the current world on each query and exposes no world action', () => {
  const state = { value: newWorld() };
  const store = {
    world: state,
    events: { value: [] },
    dispatch: () => {
      throw new Error('Must not be exposed');
    },
  } as unknown as WorldStore;
  const api = createPlantContextApi(store);
  expect(
    api.listEquipment({ room: 'plant_pool_02', kind: 'pump' })?.total,
  ).toBeGreaterThan(0);
  expect(api.getEquipment('P-101A')?.item?.status).toBe('running');
  const olympic = api.getProcessState('pool_02');
  expect(olympic?.pools).toHaveLength(1);
  expect(olympic?.pools[0].mainPool.ph).toBe(
    state.value.treatment.circuits.pool_02.pool.at(-1)?.ph,
  );
  expect('dispatch' in api).toBe(false);
  expect('world' in api).toBe(false);

  state.value = {
    ...state.value,
    motors: {
      ...state.value.motors,
      starters: {
        ...state.value.motors.starters,
        'P-101A': { ...state.value.motors.starters['P-101A'], running: false },
      },
    },
  };
  expect(api.getEquipment('P-101A')?.item?.status).toBe('stopped');
  expect(api.getProcessState('pool_02')?.pools[0].circulationFlowM3h).toBe(
    state.value.pools.pool_02.flow,
  );
});
