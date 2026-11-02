import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from '../world';
import type { World } from '../world';
import { deserialiseWorld, serialiseWorld } from '../save';
import { GAS_TEST_SECONDS, newBoilerGas } from './boiler-gas';
import type { BoilerGasAction } from './boiler-gas';

const act = (w: World, action: BoilerGasAction) =>
  applyAction(w, { type: 'boiler-gas', action });
const stop = (w: World, pressed: boolean) => act(w, { act: 'stop', pressed });
const reset = (w: World) => act(w, { act: 'reset' });

/** A world whose Olympic wants heat: its thermostat at the top of its range. */
const wantingHeat = () =>
  advance(
    applyAction(newWorld(), {
      type: 'pool/setpoint',
      pool: 'pool_02',
      celsius: 40,
    }),
    30,
    1,
  );
const heating = (w: World) =>
  Object.values(w.pools).reduce((t, p) => t + p.heating, 0);

describe('the boiler house’s gas safety', () => {
  it('starts all well, the SSOV open', () => {
    expect(newWorld().boilerGas).toEqual(newBoilerGas());
    expect(newWorld().boilerGas.ssovOpen).toBe(true);
  });

  it('shuts the SSOV when the emergency stop is struck, and keeps it shut after release', () => {
    const stopped = stop(newWorld(), true);
    expect(stopped.boilerGas.stopPressed).toBe(true);
    expect(stopped.boilerGas.ssovOpen).toBe(false);
    const released = advance(stop(stopped, false), 10, 1);
    expect(released.boilerGas.stopPressed).toBe(false);
    expect(released.boilerGas.ssovOpen).toBe(false);
  });

  it('reopens the SSOV on GAS RESET only once the stop is out', () => {
    const stopped = stop(newWorld(), true);
    expect(reset(stopped).boilerGas.ssovOpen).toBe(false);
    expect(reset(stopped)).toBe(stopped);
    expect(reset(stop(stopped, false)).boilerGas.ssovOpen).toBe(true);
  });

  it('will not reset while gas is detected or the ECV is shut', () => {
    const tested = act(newWorld(), { act: 'test' });
    expect(tested.boilerGas.gasDetected).toBe(true);
    expect(tested.boilerGas.ssovOpen).toBe(false);
    expect(reset(tested).boilerGas.ssovOpen).toBe(false);
    const cleared = advance(tested, GAS_TEST_SECONDS + 1, 1);
    expect(cleared.boilerGas.gasDetected).toBe(false);
    expect(cleared.boilerGas.ssovOpen).toBe(false);
    expect(reset(cleared).boilerGas.ssovOpen).toBe(true);
    const ecvShut = act(newWorld(), { act: 'ecv', open: false });
    expect(ecvShut.boilerGas.ssovOpen).toBe(false);
    expect(reset(ecvShut).boilerGas.ssovOpen).toBe(false);
    expect(
      reset(act(ecvShut, { act: 'ecv', open: true })).boilerGas.ssovOpen,
    ).toBe(true);
  });

  it('starves the boilers: the ring’s supply stops with the SSOV shut, and the ring cools', () => {
    const warm = wantingHeat();
    expect(heating(warm)).toBeGreaterThan(1);
    expect(warm.lthw.supply).toBeGreaterThan(1);
    const starved = advance(stop(warm, true), 10, 1);
    expect(starved.lthw.supply).toBe(0);
    expect(starved.lthw.firing).toBe(false);
    // The ring's water still carries heat to the pools for a while.
    expect(heating(starved)).toBeGreaterThan(1);
    expect(starved.lthw.flow).toBeLessThan(warm.lthw.flow);
    // Pulled out, still no gas until GAS RESET; then the supply comes back.
    const released = advance(stop(starved, false), 10, 1);
    expect(released.lthw.supply).toBe(0);
    // A boiler purges and lights in ten seconds or so (mission 121).
    const restored = advance(reset(released), 30, 1);
    expect(restored.lthw.supply).toBeGreaterThan(1);
    expect(restored.lthw.firing).toBe(true);
  });

  it('survives a save and reload', () => {
    const stopped = stop(newWorld(), true);
    const loaded = deserialiseWorld(serialiseWorld(stopped, 0));
    expect(loaded.ok && loaded.world.boilerGas).toEqual(stopped.boilerGas);
  });

  it('comes to a version 22 save all well, the SSOV open', () => {
    const { boilerGas: _none, ...old } = newWorld();
    const loaded = deserialiseWorld(
      JSON.stringify({
        format: 'pool-plant-save',
        version: 22,
        savedAt: 0,
        world: old,
      }),
    );
    expect(loaded.ok && loaded.world.boilerGas).toEqual(newBoilerGas());
  });
});
