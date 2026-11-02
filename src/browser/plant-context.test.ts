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
});
