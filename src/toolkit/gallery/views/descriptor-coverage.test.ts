/**
 * Mission 131's coverage: in the described rooms, every 3D control's
 * action comes from a descriptor. The Jacuzzi plant room's cabinet
 * services (valves, the valve panel, the isolator), its cabinet's world
 * binding, and the control room's working mimics are built against a
 * stand-in store; every use is worked, and each action dispatched must be
 * one a descriptor control gives in that world.
 */
import { afterEach, beforeEach, expect, it, vi } from 'vite-plus/test';
import { signal } from '@preact/signals-core';
import { newWorld } from '../../../game/world';
import type { World, WorldAction } from '../../../game/world';
import { objectDescriptors } from '../../../game/descriptors/registry';
import { createPanelKit } from '../../components/core/views/eighties-controls';

const store = {
  world: signal(newWorld()),
  dispatch: vi.fn((_a: WorldAction) => {}),
};
vi.mock('../../save/world-store', () => ({
  worldStore: () => store,
  roomWorld: () => store,
}));
beforeEach(() => {
  store.world.value = newWorld();
  store.dispatch.mockClear();
  vi.stubGlobal('window', { addEventListener: vi.fn() });
  vi.stubGlobal('document', {
    createElement: () => {
      const canvas = { width: 0, height: 0, getContext: () => context };
      const gradient = () => ({ addColorStop() {} });
      const context = new Proxy(
        {
          canvas,
          measureText: (text: string) => ({ width: text.length * 7 }),
          createLinearGradient: gradient,
          createRadialGradient: gradient,
        },
        {
          get: (target, key) =>
            key in target ? Reflect.get(target, key) : () => {},
        },
      );
      return canvas;
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

/** Every action the room's descriptors give in `world`. */
const described = (room: string, world: World) =>
  objectDescriptors(room).flatMap((d) =>
    d.controls.flatMap((c) =>
      c.inputs.flatMap((input) => {
        const a = c.action?.(world, input);
        return a ? [JSON.stringify(a)] : [];
      }),
    ),
  );

const expectDescribed = (room: string, world: World) => {
  const allowed = new Set(described(room, world));
  for (const [action] of store.dispatch.mock.calls)
    expect(allowed, JSON.stringify(action)).toContain(JSON.stringify(action));
};

it('works the Jacuzzi plant room’s valves, valve panel and isolator only through its descriptors', async () => {
  const { cabinetServices } = await import('./cabinet-services');
  const kit = createPanelKit();
  const services = cabinetServices(kit, 'plant_pool_03', 0)!;
  expect(services.uses.size).toBeGreaterThan(0);
  let worked = 0;
  for (const use of services.uses.values()) {
    const before = store.world.value;
    store.dispatch.mockClear();
    use();
    expectDescribed('plant_pool_03', before);
    worked += store.dispatch.mock.calls.length;
  }
  // The isolator, eight overrides and sixteen panel buttons at least.
  expect(worked).toBeGreaterThanOrEqual(25);
  services.dispose();
});

it('works the Jacuzzi cabinet’s front only through its descriptor', async () => {
  const { jacuzziWorldBinding, spaFilterWorldBinding } =
    await import('../rooms/plant/spa-pack');
  const binding = jacuzziWorldBinding(store as never);
  const filter = spaFilterWorldBinding(store as never, 'pool_03');
  const w = store.world.value;
  binding.setPower(false);
  binding.setPower(true);
  binding.reset();
  binding.toggle('jets');
  binding.toggle('air');
  binding.setSetpoint(w.pools.pool_03.setpoint + 0.5);
  binding.setSetpoint(w.pools.pool_03.setpoint - 0.5);
  filter.mode();
  filter.washNow();
  expect(store.dispatch).toHaveBeenCalledTimes(9);
  expectDescribed('plant_pool_03', w);
});

it('presses the control room’s working mimics only through their descriptors', async () => {
  const { EXHIBITS } = await import('../rooms/plant/control');
  const { createUpperMimic } = await import('./control-room-upper-mimics');
  const kit = createPanelKit();
  const main = EXHIBITS.find((e) => e.title === 'Mimic: main pool circuit')!;
  const built = main.build(kit) as {
    parts?: { uses: Map<unknown, () => void> };
  };
  const boiler = createUpperMimic(kit, 'mimic-boiler-heat')!;
  let pressed = 0;
  for (const parts of [built.parts, boiler.parts])
    for (const use of parts?.uses.values() ?? []) {
      store.dispatch.mockClear();
      use();
      expectDescribed('control_room', store.world.value);
      pressed += store.dispatch.mock.calls.length;
    }
  // The pumps' four buttons and the boilers' START and STOP.
  expect(pressed).toBe(6);
});

it('works the Jacuzzi plant room’s pipework valves (its day tanks’) only through its descriptors', async () => {
  const { createRoomPipework } = await import('./room-pipework');
  const pipework = createRoomPipework(createPanelKit(), 'plant_pool_03');
  let worked = 0;
  for (const use of pipework.uses.values()) {
    const before = store.world.value;
    store.dispatch.mockClear();
    use();
    expectDescribed('plant_pool_03', before);
    worked += store.dispatch.mock.calls.length;
  }
  // The day tanks' six chemical valves.
  expect(worked).toBeGreaterThanOrEqual(6);
});
