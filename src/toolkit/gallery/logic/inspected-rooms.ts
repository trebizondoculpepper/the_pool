/**
 * Rooms whose first-person controller wires the information overlay
 * (`inspect: createInspector(...)` in `createFirstPerson`'s options, so
 * what is aimed at is named in the help line — prompt 061). The guard
 * (`inspected-rooms.test.ts`) enforces the rule: a room that places parts
 * with uses (buttons, knobs, switches, valve handles — anything a click
 * works) must be on this list, or nothing it holds is ever named when
 * aimed at, which is a bug (the main corridor's MC-FT converters were
 * such a case, 2026-11-02). Keep this list true: a room whose starter
 * passes `inspect` to `createFirstPerson` belongs here.
 *
 * Known exception, on the owner's instruction (2026-11-02, "test only, no
 * fix yet"): `main_corridor` is deliberately absent — it places working
 * parts but its starter does not wire `inspect` yet, and the guard
 * reports it (see `KNOWN_UNINSPECTED` in `inspected-rooms.test.ts`)
 * until the corridor is wired and this list gains it.
 */

/** The rooms wired for the information overlay, by their starter. */
export const INSPECTED_ROOMS: ReadonlySet<string> = new Set([
  // The shell rooms (shell-room.ts, `inspect` at its first-person options).
  'boiler_house',
  'loading_bay',
  'hypo_store',
  'acid_store',
  'switch_room',
  'air_plant',
  'control_room',
  'engineers_office',
  'wet_hall',
  // The equipment rooms and their exhibit rooms (plant-room-shell-room.ts,
  // plant-room.ts — the latter gates on its own `INSPECTED`, dev51).
  'plant_pool_01',
  'plant_pool_02',
  'plant_pool_03',
  'plant_pool_04',
  'dev51',
  // dev0's boards (controls-room.ts).
  'dev0',
  // The museum halls (museum-hall-room.ts), the plant halls of them (the
  // display halls 0, 5, 7, 8 are exempt: photos, placards, specimens).
  'museum1',
  'museum2',
  'museum3',
  'museum4',
  'museum6',
  'museum9',
  // The tank hall and the CO₂ cage (tank-hall-room.ts, co2-cage-room.ts).
  'tank_hall',
  'dev55',
]);
