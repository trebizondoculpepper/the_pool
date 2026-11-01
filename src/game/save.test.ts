import { describe, expect, it } from 'vite-plus/test';
import {
  CATCH_UP_LIMIT,
  catchUpSeconds,
  MIGRATIONS,
  deserialiseWorld,
  fillDefaults,
  serialiseWorld,
} from './save';
import { WORLD_VERSION, applyAction, newWorld } from './world';
import { FOOTBATH, partOpen } from './plant/identification';

describe('a save', () => {
  it('installs the normal CO₂ system when a version 65 save is loaded', () => {
    const { co2: _, ...before } = newWorld();
    const loaded = deserialiseWorld(
      JSON.stringify({
        format: 'pool-plant-save',
        version: 65,
        savedAt: 5,
        world: before,
      }),
    );
    expect(
      loaded.ok && loaded.world.co2.distribution.ports.plant_pool_01.open,
    ).toBe(true);
    expect(
      loaded.ok && loaded.world.co2.distribution.ports.plant_pool_02.open,
    ).toBe(true);
    expect(loaded.ok && loaded.world.co2.dosers.plant_pool_01.mode).toBe(
      'remote',
    );
  });

  it('gives a version 66 save its CO₂ racks in grams, from its cylinders', () => {
    const w = newWorld();
    const cyl = (kg: number) => ({ kg, open: true });
    const old = {
      ...w,
      co2: {
        ...w.co2,
        distribution: {
          ...w.co2.distribution,
          supply: {
            banks: {
              left: [cyl(10), cyl(10), cyl(10), cyl(10)],
              right: [cyl(34), cyl(34), cyl(34), cyl(34)],
            },
            service: 'left',
            isolation: true,
            ambient: 12,
          },
        },
      },
    };
    const loaded = deserialiseWorld(
      JSON.stringify({
        format: 'pool-plant-save',
        version: 66,
        savedAt: 5,
        world: old,
      }),
    );
    expect(loaded.ok && loaded.world.co2.distribution.supply).toEqual({
      racks: { left: 40_000, right: 136_000 },
      service: 'left',
      isolation: true,
      ambient: 12,
    });
    expect(loaded.ok && loaded.world.co2.detectors.loading_bay.twaReset).toBe(
      false,
    );
  });

  it('brings back the world it saved', () => {
    const world = applyAction(newWorld(), { type: 'demo/set', on: true });
    const loaded = deserialiseWorld(serialiseWorld(world, 1000));
    expect(loaded).toEqual({ ok: true, world, savedAt: 1000 });
  });

  it('loads an older pit-pump save with BOOST off', () => {
    const old = newWorld();
    const pitPumps = { ...old.wetHall.pitPumps } as Partial<
      typeof old.wetHall.pitPumps
    >;
    delete pitPumps.boost;
    const saved = JSON.stringify({
      format: 'pool-plant-save',
      version: 62,
      savedAt: 5,
      world: { ...old, wetHall: { ...old.wetHall, pitPumps } },
    });
    const loaded = deserialiseWorld(saved);
    expect(loaded.ok && loaded.world.wetHall.pitPumps.boost).toBe(false);
  });

  it('loads a save from before hand doses could be fed with none being fed, and keeps one that is', () => {
    const old = newWorld();
    const { charges: _, ...treatment } = old.treatment;
    const saved = JSON.stringify({
      format: 'pool-plant-save',
      version: 63,
      savedAt: 5,
      world: { ...old, treatment },
    });
    const loaded = deserialiseWorld(saved);
    expect(loaded.ok && loaded.world.treatment.charges.pool_01).toEqual([]);
    const dosing = applyAction(old, {
      type: 'hand/dose',
      pool: 'pool_01',
      chemical: 'bicarbonate',
      amount: 10,
      rate: 0.5,
    });
    const again = deserialiseWorld(serialiseWorld(dosing, 5));
    expect(again.ok && again.world.treatment.charges.pool_01).toHaveLength(1);
  });

  it('puts in at once a dose a version 64 save was still dissolving', () => {
    const old = newWorld();
    const charge = {
      additions: { bicarbonate: 10000 },
      fresh: 0,
      into: 'balance-tank',
      seconds: 720,
      left: 0.5,
    };
    const saved = JSON.stringify({
      format: 'pool-plant-save',
      version: 64,
      savedAt: 5,
      world: {
        ...old,
        treatment: {
          ...old.treatment,
          charges: { ...old.treatment.charges, pool_01: [charge] },
        },
      },
    });
    const loaded = deserialiseWorld(saved);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.world.treatment.charges.pool_01).toEqual([]);
    expect(
      loaded.world.treatment.circuits.pool_01.tank.alkalinity,
    ).toBeGreaterThan(old.treatment.circuits.pool_01.tank.alkalinity + 100);
  });

  it('refuses what is not a save of ours, and saves from a newer build', () => {
    expect(deserialiseWorld('{not json').ok).toBe(false);
    expect(deserialiseWorld('{"format":"other"}').ok).toBe(false);
    const newer = JSON.stringify({
      format: 'pool-plant-save',
      version: 99,
      savedAt: 0,
      world: {},
    });
    expect(deserialiseWorld(newer)).toEqual({
      ok: false,
      reason: 'the save is from a newer version (99)',
    });
  });

  it('fills fields an old save lacks from the defaults, and drops ones no longer used', () => {
    // A current save lacking fields (an older one is a new world: below).
    const old = JSON.stringify({
      format: 'pool-plant-save',
      version: WORLD_VERSION,
      savedAt: 5,
      world: { time: 40, demo: { on: true }, retired: 3 },
    });
    const loaded = deserialiseWorld(old);
    expect(loaded.ok && loaded.world).toEqual({
      time: 40,
      demo: { on: true, presses: 0 },
      plant: newWorld().plant,
      pools: newWorld().pools,
      treatment: newWorld().treatment,
      dosingPumps: newWorld().dosingPumps,
      aqualis: newWorld().aqualis,
      co2: newWorld().co2,
      chemicals: newWorld().chemicals,
      distribution: newWorld().distribution,
      chemControl: newWorld().chemControl,
      wetHall: newWorld().wetHall,
      bathers: newWorld().bathers,
      startup: -1,
      lighting: newWorld().lighting,
      centralBattery: newWorld().centralBattery,
      sewer: newWorld().sewer,
      makeUpRecord: newWorld().makeUpRecord,
      ambient: newWorld().ambient,
      gas: newWorld().gas,
      identifiedPlant: newWorld().identifiedPlant,
      installedValves: newWorld().installedValves,
      loungeValvePositions: newWorld().loungeValvePositions,
      loungeFilters: newWorld().loungeFilters,
      olympic: newWorld().olympic,
      olympicTank: newWorld().olympicTank,
      airHandling: newWorld().airHandling,
      motors: newWorld().motors,
      jacuzzi: newWorld().jacuzzi,
      jacuzziCabinet: newWorld().jacuzziCabinet,
      spaFilters: newWorld().spaFilters,
      cabinets: newWorld().cabinets,
      jacuzziFibreIlluminator: newWorld().jacuzziFibreIlluminator,
      boilerGas: newWorld().boilerGas,
      music: newWorld().music,
      fireAlarm: newWorld().fireAlarm,
      washOTron: newWorld().washOTron,
      intake: newWorld().intake,
      controlRoomMode: 'old',
      bridgeThemeHeard: false,
      bridgeDisplaysOn: false,
      annunciator: newWorld().annunciator,
      locationAnnunciators: newWorld().locationAnnunciators,
      bridgeConsoles: newWorld().bridgeConsoles,
      lifts: newWorld().lifts,
    });
  });

  it('drops the states of valves no longer installed (the Olympic plant room, cleared for its redo)', () => {
    const world = newWorld();
    const old = JSON.stringify({
      format: 'pool-plant-save',
      version: 15,
      savedAt: 5,
      // valve-0010 was the Olympic's filter 1 inlet valve (PL2-F1-IV1).
      world: {
        ...world,
        installedValves: { ...world.installedValves, 'valve-0010': false },
      },
    });
    const loaded = deserialiseWorld(old);
    expect(loaded.ok && loaded.world.installedValves).toEqual(
      world.installedValves,
    );
  });

  it('migrates an old footbath drain and make-up lineup to named valves', () => {
    const { identifiedPlant: _oldTree, ...oldWorld } = newWorld();
    // Through the migrations from version 13 to 26 (a save older than 27
    // loads as a new world, so they are applied here directly).
    let world: unknown = {
      ...oldWorld,
      pools: {
        ...oldWorld.pools,
        pool_04: { ...oldWorld.pools.pool_04, drainDown: true, makeUp: false },
      },
    };
    for (let v = 13; v < 26; v++) world = MIGRATIONS[v](world);
    const migrated = fillDefaults(world, newWorld());
    expect(partOpen(migrated.identifiedPlant, FOOTBATH.drain)).toBe(true);
    expect(partOpen(migrated.identifiedPlant, FOOTBATH.return)).toBe(false);
    expect(partOpen(migrated.identifiedPlant, FOOTBATH.makeUp)).toBe(false);
  });

  it('throws away a save from before the jacuzzi was built from its model (version 27)', () => {
    const old = JSON.stringify({
      format: 'pool-plant-save',
      version: 26,
      savedAt: 5,
      world: { ...newWorld(), time: 400 },
    });
    const loaded = deserialiseWorld(old);
    expect(loaded.ok && loaded.world).toEqual(newWorld());
  });

  it('brings a save from before the CONTROL ROOM MODE knob up with it at OLD', () => {
    const { controlRoomMode: _none, ...before } = newWorld();
    const old = JSON.stringify({
      format: 'pool-plant-save',
      version: 46,
      savedAt: 5,
      world: { ...before, time: 400 },
    });
    const loaded = deserialiseWorld(old);
    expect(loaded.ok && loaded.world.controlRoomMode).toBe('old');
    expect(loaded.ok && loaded.world.time).toBe(400);
    expect(MIGRATIONS[46]({ time: 1 })).toEqual({
      time: 1,
      controlRoomMode: 'old',
    });
  });

  it('brings a save from before the world’s annunciator up with every window dark', () => {
    const { annunciator: _none, ...before } = newWorld();
    const old = JSON.stringify({
      format: 'pool-plant-save',
      version: 48,
      savedAt: 5,
      world: { ...before, time: 400 },
    });
    const loaded = deserialiseWorld(old);
    expect(loaded.ok && loaded.world.annunciator).toEqual(
      newWorld().annunciator,
    );
    expect(loaded.ok && loaded.world.time).toBe(400);
  });

  it('brings a save from before the bridge’s console paging up with every console on its default, unlocked', () => {
    const { bridgeConsoles: _none, ...before } = newWorld();
    const old = JSON.stringify({
      format: 'pool-plant-save',
      version: 51,
      savedAt: 5,
      world: before,
    });
    const loaded = deserialiseWorld(old);
    expect(loaded.ok && loaded.world.bridgeConsoles).toEqual(
      newWorld().bridgeConsoles,
    );
  });

  it('keeps a bridge console’s page and lock, drops consoles no longer there, keeps a page id it does not know', () => {
    let world = applyAction(newWorld(), {
      type: 'bridge/console',
      console: 'flow-navigator.panel',
      page: 'overview.gas',
    });
    world = applyAction(world, {
      type: 'bridge/console',
      console: 'viewscreen',
      page: 'no-such-page',
    });
    world = applyAction(world, {
      type: 'bridge/console',
      console: 'viewscreen',
      locked: true,
    });
    const text = serialiseWorld(
      {
        ...world,
        bridgeConsoles: {
          ...world.bridgeConsoles,
          'gone.panel': { page: 'x', locked: true },
        },
      },
      5,
    );
    const loaded = deserialiseWorld(text);
    if (!loaded.ok) throw new Error(loaded.reason);
    const c = loaded.world.bridgeConsoles;
    expect(c['flow-navigator.panel']).toEqual({
      page: 'overview.gas',
      locked: false,
    });
    expect(c.viewscreen).toEqual({ page: 'no-such-page', locked: true });
    expect(c['gone.panel']).toBeUndefined();
  });

  it('keeps a field only where its type matches', () => {
    expect(fillDefaults({ a: 'x', b: Number.NaN }, { a: 1, b: 2 })).toEqual({
      a: 1,
      b: 2,
    });
  });

  it('keeps a saved value where the default is null (a starter’s command)', () => {
    expect(
      fillDefaults(
        { a: true, b: 2, c: { x: 1 } },
        { a: null, b: null, c: null },
      ),
    ).toEqual({ a: true, b: 2, c: null });
    const started = applyAction(newWorld(), {
      type: 'motor/starter',
      tag: 'P-101B',
      action: { act: 'start' },
    });
    const loaded = deserialiseWorld(serialiseWorld(started, 0));
    expect(loaded.ok && loaded.world.motors.starters['P-101B'].command).toBe(
      true,
    );
  });

  it('catches up the time it was away, up to an hour', () => {
    expect(catchUpSeconds(0, 90_000)).toBe(90);
    expect(catchUpSeconds(0, 10 * 3600_000)).toBe(CATCH_UP_LIMIT);
    expect(catchUpSeconds(5000, 0)).toBe(0);
  });
});

describe('the water chemistry migration (57 → 58, mission 101)', () => {
  it('fills each pool’s circuit with nominal water at its present readings', () => {
    const { treatment: _t, ...rest } = newWorld();
    const pools = {
      ...rest.pools,
      pool_02: { ...rest.pools.pool_02, freeChlorine: 0.8, ph: 7.6 },
    };
    const v57 = MIGRATIONS[57]({ ...rest, pools }) as ReturnType<
      typeof newWorld
    >;
    const olympic = v57.treatment.circuits.pool_02;
    expect(olympic.pool).toHaveLength(3);
    for (const w of [olympic.tank, ...olympic.pool]) {
      expect(w.freeChlorine).toBeCloseTo(0.8, 9);
      expect(w.ph).toBeCloseTo(7.6, 6);
    }
    expect(v57.treatment.circuits.pool_01.pool[2].freeChlorine).toBeCloseTo(
      rest.pools.pool_01.freeChlorine,
      9,
    );
  });
});
