import { describe, expect, it } from 'vite-plus/test';
import { newWorld } from '../world';
import {
  getPlantEquipment,
  listPlantAlarms,
  listPlantEquipment,
  listPlantEvents,
  plantContextCoverage,
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
