import { describe, expect, it } from 'vite-plus/test';
import { newWorld } from '../world';
import {
  getPlantConnections,
  getPlantEquipment,
  listPlantAlarms,
  listPlantEquipment,
  listPlantEvents,
  plantContextCoverage,
  plantWashFacts,
} from './plant-context';

describe('browser plant context', () => {
  it('reads the live starter and installed valve without exposing the world', () => {
    const world = newWorld();
    const pump = getPlantEquipment(world, 'P-101A');
    expect(pump?.status).toBe('running');
    expect(pump?.details?.running).toBe(true);
    expect(pump?.details?.mode).toBe('auto');

    const valve = getPlantEquipment(world, 'PL2-P1-IV1');
    expect(valve?.status).toBe('open');
    expect(valve?.connection?.medium).toBe('water');
    expect(valve?.assetId).toBeTruthy();
    if (!valve?.assetId) throw new Error('Expected the valve asset ID');

    const changed = {
      ...world,
      installedValves: { ...world.installedValves, [valve.assetId]: false },
      motors: {
        ...world.motors,
        starters: {
          ...world.motors.starters,
          'P-101A': {
            ...world.motors.starters['P-101A'],
            running: false,
            tripped: true,
          },
        },
      },
    };
    expect(getPlantEquipment(changed, valve.assetId)?.status).toBe('shut');
    expect(getPlantEquipment(changed, 'P-101A')?.status).toBe('tripped');
    expect(getPlantEquipment(world, valve.assetId)?.status).toBe('open');
  });

  it('pages a facility-wide inventory and reports missing readers', () => {
    const world = newWorld();
    const first = listPlantEquipment(world, { limit: 2 });
    expect(first.schema).toBe(1);
    expect(first.items).toHaveLength(2);
    expect(first.total).toBeGreaterThan(2);
    expect(
      listPlantEquipment(world, { offset: 2, limit: 2 }).items[0]?.ref,
    ).not.toBe(first.items[0]?.ref);
    expect(
      listPlantEquipment(world, {
        room: 'plant_pool_02',
        kind: 'pump',
      }).items.some((item) => item.ref === 'P-101A'),
    ).toBe(true);
    expect(plantContextCoverage(world).withoutReadableState).toBeGreaterThan(0);
  });

  it('reads transfer, dosing, booster and heating pumps from their own blocks', () => {
    const world = newWorld();
    expect(getPlantEquipment(world, 'AS-P1')?.details?.running).toBe(false);
    expect(getPlantEquipment(world, 'HS-P1')?.details?.mode).toBe('auto');
    expect(getPlantEquipment(world, 'PL2-DP1')?.details?.setLh).toBe(0);
    expect(getPlantEquipment(world, 'WH-P1')?.details?.tripped).toBe(false);
    expect(getPlantEquipment(world, 'BH-P1')?.details?.running).toBe(true);
    expect(
      getPlantEquipment(world, 'world:wetHall.pitPumps.1')?.details?.running,
    ).toBe(false);

    const changed = {
      ...world,
      distribution: {
        ...world.distribution,
        acid: { ...world.distribution.acid, tripped: true },
      },
      lthw: { ...world.lthw, pumps: false },
      wetHall: {
        ...world.wetHall,
        boosterTripped: true,
        pitPumps: {
          ...world.wetHall.pitPumps,
          running: [true, false] as [boolean, boolean],
        },
      },
    };
    expect(getPlantEquipment(changed, 'AS-P1')?.status).toBe('tripped');
    expect(getPlantEquipment(changed, 'WH-P1')?.status).toBe('tripped');
    expect(getPlantEquipment(changed, 'BH-P1')?.status).toBe('stopped');
    expect(getPlantEquipment(changed, 'world:wetHall.pitPumps.1')?.status).toBe(
      'running',
    );
  });

  it('shows actual annunciator state separately from its lamp', () => {
    const world = newWorld();
    const id = listPlantAlarms(world).items[0]?.ref;
    if (!id) throw new Error('Expected an annunciator window');
    const [location, alarm] = id.split('/');
    if (
      location !== 'pool_01' &&
      location !== 'pool_02' &&
      location !== 'wet_hall'
    )
      throw new Error('Unexpected location');
    const changed = {
      ...world,
      locationAnnunciators: {
        ...world.locationAnnunciators,
        [location]: {
          ...world.locationAnnunciators[location],
          present: {
            ...world.locationAnnunciators[location].present,
            [alarm]: true,
          },
          windows: {
            ...world.locationAnnunciators[location].windows,
            [alarm]: 'flashing' as const,
          },
          firstOut: alarm,
        },
      },
    };
    expect(listPlantAlarms(changed, { activeOnly: true }).items).toContainEqual(
      expect.objectContaining({
        ref: id,
        present: true,
        window: 'flashing',
        firstOut: true,
      }),
    );
  });

  it('reports measured tank contents and wash controller alarms', () => {
    const world = newWorld();
    const backwash = listPlantEquipment(world, {
      room: 'wet_hall',
      kind: 'backwash-tank',
    }).items[0];
    if (!backwash) throw new Error('Expected the backwash tank');
    expect(backwash?.details?.volumeM3).toBe(world.wetHall.backwashTank);
    const day = listPlantEquipment(world, {
      room: 'plant_pool_02',
      kind: 'chem-day',
    }).items;
    expect(day.some((item) => typeof item.details?.litres === 'number')).toBe(
      true,
    );
    expect(
      getPlantEquipment(world, 'world:chemicals.hypochlorite')?.details
        ?.storeLitres,
    ).toBe(world.chemicals.hypochlorite);
    expect(
      listPlantEquipment(world, {
        room: 'hypo_store',
        kind: 'chem-bulk',
      }).items.every((item) => item.details?.storeLitres === undefined),
    ).toBe(true);

    const changed = {
      ...world,
      wetHall: { ...world.wetHall, backwashTank: 80, inhibit: true },
      washOTron: {
        ...world.washOTron,
        alarms: {
          ...world.washOTron.alarms,
          pitInhibit: { on: true, accepted: false },
        },
      },
    };
    expect(getPlantEquipment(changed, backwash.ref)?.details?.volumeM3).toBe(
      80,
    );
    expect(listPlantAlarms(changed, { activeOnly: true }).items).toContainEqual(
      expect.objectContaining({
        ref: 'wash-o-tron/pitInhibit',
        present: true,
        window: 'flashing',
        details: expect.objectContaining({ pitM3: 80, pitInhibited: true }),
      }),
    );
  });

  it('reads each boiler controller without guessing at an unmodelled state', () => {
    const world = newWorld();
    const boilers = listPlantEquipment(world, {
      room: 'boiler_house',
      kind: 'boiler',
    }).items;
    expect(boilers).toHaveLength(6);
    expect(boilers.some((item) => item.status === 'firing')).toBe(true);
    expect(boilers.every((item) => item.details?.powerAvailable === true)).toBe(
      true,
    );
  });

  it('reads Olympic riser and discharge meters from the battery flows', () => {
    const world = newWorld();
    expect(getPlantEquipment(world, 'PL2-F1-FT1')?.details?.flowM3h).toBeTypeOf(
      'number',
    );
    expect(getPlantEquipment(world, 'PL2-P1-FT1')?.details?.flowM3h).toBeTypeOf(
      'number',
    );
    expect(
      listPlantEquipment(world, { room: 'wet_hall', kind: 'make-up-flowmeter' })
        .items[0]?.details?.flowM3h,
    ).toBe(world.wetHall.flow);
  });

  it('exposes wash inputs and lockout as raw controller facts', () => {
    const world = newWorld();
    const changed = {
      ...world,
      wetHall: { ...world.wetHall, backwashTank: 80, inhibit: true },
      washOTron: {
        ...world.washOTron,
        hold: true,
        waiting: 'PIT INHIBIT' as const,
        filters: world.washOTron.filters.map((filter, index) =>
          index === 0 ? { ...filter, lockout: true } : filter,
        ),
      },
    };
    const facts = plantWashFacts(changed);
    expect(facts.pit.volumeM3).toBe(80);
    expect(facts.pit.inletInhibited).toBe(true);
    expect(facts.waiting).toBe('PIT INHIBIT');
    expect(facts.hold).toBe(true);
    expect(facts.filters[0].lockout).toBe(true);
  });

  it('follows schematic links from a pump and names valves on them', () => {
    const world = newWorld();
    const connections = getPlantConnections(world, 'P-101A');
    expect(connections?.available).toBe(true);
    expect(
      connections?.links.some((link) => link.link === 'tank.suctionA'),
    ).toBe(true);
    expect(
      connections?.links.some(
        (link) =>
          link.from.refs.includes('P-101A') || link.to.refs.includes('P-101A'),
      ),
    ).toBe(true);
    expect(
      connections?.links
        .find((link) => link.link === 'tank.suctionA')
        ?.valves.some(
          (valve) => valve.ref === 'PL2-P1-IV1' && valve.status === 'open',
        ),
    ).toBe(true);
    const valve = getPlantConnections(world, 'PL1-P1-IV1');
    expect(valve?.links.length).toBeGreaterThan(0);
    expect(
      valve?.links.some((link) =>
        link.valves.some((item) => item.ref === 'PL1-P1-IV1'),
      ),
    ).toBe(true);
  });

  it('bounds and filters events', () => {
    const world = { ...newWorld(), time: 3 };
    const events = [
      {
        time: 1,
        kind: 'plant' as const,
        severity: 'notice' as const,
        subject: 'A',
        text: 'first',
      },
      {
        time: 2,
        kind: 'plant' as const,
        severity: 'alarm' as const,
        subject: 'B',
        text: 'second',
      },
    ];
    expect(
      listPlantEvents(world, events, { subject: 'B' }).items.map(
        (event) => event.text,
      ),
    ).toEqual(['second']);
    expect(
      listPlantEvents(world, events, { limit: 1 }).items.map(
        (event) => event.text,
      ),
    ).toEqual(['second']);
    const returned = listPlantEvents(world, events).items[0];
    returned.text = 'changed by a caller';
    expect(events[1].text).toBe('second');
  });
});
