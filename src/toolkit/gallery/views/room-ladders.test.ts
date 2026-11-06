import { Group, Scene } from 'three';
import { describe, expect, it } from 'vite-plus/test';
import {
  LADDER_KINDS,
  createHumanLadder,
} from '../../components/architectural/views/human-ladder';
import { markEquipmentKind } from '../../components/core/views/equipment-kind';
import { EQUIPMENT_KIND } from '../../components/core/views/equipment-kind';
import {
  EQUIPMENT_KINDS,
  kindAffordances,
} from '../../../game/plant/equipment-kinds';
import { kindIsLadder, roomLadders, roomTraits } from './room-traits';
import { roomLaddersFor } from '../../controls/input/room-controller';

const ROOM_SOURCES = import.meta.glob<string>(
  ['../rooms/**/*.ts', '!../rooms/**/*.test.ts'],
  { query: '?raw', import: 'default', eager: true },
);

/**
 * The ladder trait (#18): a `ladder` composite extends `functional`; every
 * human ladder is a registered kind carrying it, and the room factory makes
 * every `ladder`-kind object climbable, so no room lists its ladders.
 */
describe('the ladder trait (#18)', () => {
  it('every human ladder kind is registered and carries `ladder`', () => {
    for (const kind of Object.values(LADDER_KINDS)) {
      expect(Object.hasOwn(EQUIPMENT_KINDS, kind)).toBe(true);
      expect(kindIsLadder(kind)).toBe(true);
    }
    expect(kindIsLadder('carton')).toBe(false);
    expect(kindIsLadder('not-a-kind')).toBe(false);
  });

  it('a ladder is functional: not cued or clicked, but climbed', () => {
    for (const kind of Object.values(LADDER_KINDS))
      expect(
        kindAffordances(kind as keyof typeof EQUIPMENT_KINDS).interaction,
      ).toBe('functional');
  });

  it('a built ladder is marked with its kind', () => {
    const ladder = createHumanLadder('pool', 1.2);
    expect(ladder.group.userData[EQUIPMENT_KIND]).toBe('pool-ladder');
  });

  it("the factory finds a room's ladder-kind objects, and only those", () => {
    const scene = new Scene();
    const ladder = createHumanLadder('pool', 1.2);
    ladder.group.position.set(2, 0, 3);
    scene.add(ladder.group);
    // A ladder whose kind is not a ladder kind is not climbed by the factory.
    const other = createHumanLadder('pool', 1.2);
    markEquipmentKind(other.group, 'carton');
    scene.add(other.group);
    scene.add(new Group());
    const zones = roomLadders(scene);
    expect(zones).toHaveLength(1);
    expect(zones[0].rung.x).toBeCloseTo(ladder.zone().rung.x);
    expect(roomTraits.ladders?.(scene, 1)).toHaveLength(1);
  });

  it("stands a pool ladder's foot on the floor it is given", () => {
    const scene = new Scene();
    scene.add(createHumanLadder('pool', 1.2).group);
    const [zone] = roomLadders(scene, () => -1.7);
    expect(zone.bottom).toBeCloseTo(-1.7);
  });

  it("every room's controller climbs the factory's ladders, unless the room lists its own", () => {
    const scene = new Scene();
    scene.add(createHumanLadder('pool', 1.2).group);
    // A room with a scene but no carried things still gets them.
    const found = roomLaddersFor(roomTraits, { scene, metre: 1 });
    expect(found?.()).toHaveLength(1);
    // The floor it is given reaches the factory.
    const floored = roomLaddersFor(roomTraits, {
      scene,
      metre: 1,
      ladderFloorAt: () => -2,
    });
    expect(floored?.()[0].bottom).toBeCloseTo(-2);
    // A room listing its own keeps them; no traits, no ladders.
    expect(
      roomLaddersFor(roomTraits, { scene, metre: 1, ladders: () => [] }),
    ).toBeUndefined();
    expect(roomLaddersFor(null, { scene, metre: 1 })).toBeUndefined();
  });

  it('no room lists its ladders by hand any more', () => {
    expect(Object.keys(ROOM_SOURCES).length).toBeGreaterThan(10);
    const offenders = Object.entries(ROOM_SOURCES)
      .filter(([, source]) => source.includes('humanLadderZones('))
      .map(([file]) => file);
    expect(offenders).toEqual([]);
  });
});
