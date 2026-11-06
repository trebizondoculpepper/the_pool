# 150 plan: partly open valves say how far open

Brief: `doc/prompts/done/150-valve-opening-status.md`. Tracked in #29. nicole_buruaah, 2026-11-06. Done.

## The wording (decided)

One pure function, `valveStateWords` in `src/game/plant/component-descriptions.ts`, used by every surface:

- **shut** at or below 2% (`VALVE_SHUT_AT`), **open** at or above 98% (`VALVE_OPEN_AT`), otherwise **part open, 30%** (whole percent; the pool controllers' valves move in 10% steps, so they read 10%, 20% …).
- A modulating valve whose actuator is still travelling (its commanded position more than 0.5% from where it is) says **opening, 40%** or **closing, 30%**, where it is now. Mission 149's commanded position was not needed: the controller state already keeps `commandedPosition` beside `valvePosition`.
- A valve the model holds only as open or shut says **open** or **shut**.
- Percent as "30%" (no space), as the diagnostics already write the same valve's position.

## Where positions are read

`resolveStatus` (`component-status.ts`) now returns `{ policy: 'valve', open, opening?, commanded? }` (the old `partly` flag is gone):

- **The Lounge's actuated valves:** `world.loungeValvePositions[assetId]` (actual travel).
- **The pool exchangers' modulating LTHW valves** (PL1-HX1-CV1, PL2-HX1-CV1): `world.poolTemperatureControls[pool].valvePosition` and `commandedPosition`, matched by `TEMPERATURE_CONTROL_VALVES` (moved from `world.ts` into `pool-temperature-control.ts`, so the world and the status share one table).
- **Everything else:** booleans (`installedValves`, identified parts), unchanged.

Not covered, by design: the dev and museum rigs' valve openings (`five-valve-filter.ts`, `ideal-filter.ts`, `ideal-pool-plant.ts`) are not in the described register `resolveStatus` reads; their own displays show them.

## Surfaces

Through `inspectionStatus` and the description prose: the hover line and heading, the object detail page (145), the diagnostics' plant context (and so the browser plant report and descriptors that read it), and the inventory the audits use. The console's `valves` list and object status (`status <tag>`) now use the same words. `doc/equipment-status.md` lists the wording.

## Checked

- Tests: `valve-opening-status.test.ts` (thresholds, stroking, PL2-HX1-CV1 at 0, 0.3, 1 and opening, the Lounge's PL1-F1-IV1, an on/off valve); the existing Lounge travel test now expects "part open, N%".
- Browser: `?room=plant_pool_02&look=PL2-HX1-CV1&mode=front`: the hover reads "PL2-HX1-CV1 (butterfly valve) - part open, 20%".

## Follow-up

- The control valve's description says it "Isolates heating water …", and its type reads "butterfly valve"; a modulating control valve regulates rather than isolates. A wording/kind fix for its own issue.
