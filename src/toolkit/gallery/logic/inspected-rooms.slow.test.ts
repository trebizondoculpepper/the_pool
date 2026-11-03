import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { Group } from 'three';
import type { Object3D } from 'three';
import { createPanelKit } from '../../components/core/views/eighties-controls';
import { createMainCorridor } from '../views/main-corridor';
import { createRoomEquipment } from '../views/room-equipment';
import { stubBrowser } from '../views/inspection-audit';
import { INSPECTED_ROOMS } from './inspected-rooms';

/**
 * The information overlay's guard (prompt 061; the owner, 2026-11-02): a
 * room that places machines with buttons and actions — parts whose `uses`
 * a click works — must wire the inspector (`inspect: createInspector` in
 * its starter's `createFirstPerson` options), or nothing it holds is ever
 * named when aimed at. Any such placement in an uninspected room is
 * almost certainly a bug: the main corridor's MC-FT converters were one
 * (they sit on the wall with a KESSLER-MOODY readout, but the corridor
 * names nothing on hover).
 *
 * The scan builds each room's parts headless, as the game does, and
 * counts parts with uses. Every room with any must be on `INSPECTED_ROOMS`
 * — except the known exception below, which the owner asked to report
 * rather than fix yet ("test only, no fix"; 2026-11-02): `main_corridor`.
 * When the corridor is wired, remove it from `KNOWN_UNINSPECTED` and add
 * it to `INSPECTED_ROOMS`.
 */

/** Rooms that place working parts but are not yet inspected, each with its reason. */
export const KNOWN_UNINSPECTED: Readonly<Record<string, string>> = {
  main_corridor:
    'its starter does not pass inspect to createFirstPerson, so the MC-FT converters, doors and CONTROL ROOM MODE knob are never named on hover (the owner, 2026-11-02: test only, no fix yet)',
};

/** Each scanned room's parts, built headless as the game builds them. */
function partsOf(room: string): { parts: PartLike[]; group: Group } {
  if (room === 'main_corridor') {
    const { group, waterMeters, doors } = createMainCorridor(
      1,
      createPanelKit(),
    );
    return {
      group,
      parts: [...waterMeters, ...doors.map((d) => d.part)],
    };
  }
  const equipment = createRoomEquipment(createPanelKit(), room);
  return { group: equipment.group, parts: [] };
}

interface PartLike {
  uses: Map<Object3D, unknown>;
}

/** Whether the room's scene carries any part a click works. */
function hasActionableParts(room: string): { yes: boolean; seen: string[] } {
  const { group, parts } = partsOf(room);
  const seen: string[] = [];
  const note = (name: string) => {
    if (seen.length < 12) seen.push(name);
  };
  let actionable = false;
  for (const part of parts) {
    if (part.uses.size > 0) {
      actionable = true;
      note(`${part.constructor?.name ?? 'part'} (${part.uses.size} uses)`);
    }
  }
  // The equipment rooms' parts live inside their machines (a room's
  // `useOf`); walk the group for working parts too.
  group.traverse((o) => {
    if ((o.userData as { workingPart?: boolean }).workingPart) {
      const own = o.name || '(unnamed part)';
      if (!seen.includes(own)) note(own);
    }
  });
  return { yes: actionable, seen };
}

describe('rooms that place machines with buttons and actions wire the information overlay', () => {
  beforeEach(stubBrowser);
  afterEach(() => vi.unstubAllGlobals());

  // The rooms the game builds that can place plant machinery: the
  // equipment rooms, the shell rooms, the corridor and the museum halls.
  const scanned = [
    'plant_pool_01',
    'plant_pool_02',
    'plant_pool_03',
    'plant_pool_04',
    'wet_hall',
    'boiler_house',
    'hypo_store',
    'acid_store',
    'switch_room',
    'air_plant',
    'control_room',
    'engineers_office',
    'main_corridor',
    'museum1',
    'museum2',
    'museum3',
    'museum4',
    'museum6',
    'museum9',
  ];

  it('every room that places actionable parts is wired for the information overlay', () => {
    const violations: string[] = [];
    for (const room of scanned) {
      const { yes, seen } = hasActionableParts(room);
      if (!yes) continue;
      if (INSPECTED_ROOMS.has(room)) continue;
      const known = KNOWN_UNINSPECTED[room];
      violations.push(
        known
          ? `  ${room}: KNOWN UNINSPECTED — ${known} [${seen.join(', ')}]`
          : `  ${room}: places actionable parts but is not in INSPECTED_ROOMS [${seen.join(', ')}]`,
      );
    }
    if (violations.length)
      console.warn(
        'Inspector guard: rooms placing actionable machines without the overlay:\n' +
          violations.join('\n'),
      );
    for (const room of scanned) {
      const { yes } = hasActionableParts(room);
      if (!yes || INSPECTED_ROOMS.has(room) || KNOWN_UNINSPECTED[room])
        continue;
      expect(
        INSPECTED_ROOMS,
        `${room} places parts with actions but is not in INSPECTED_ROOMS`,
      ).toContain(room);
    }
  });
});
