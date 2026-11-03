# 151: Climbing onto plant room 1's balance tank: the ladder leads somewhere you can stand

The owner, 2026-11-03: "It's not currently possible to climb onto P1's balancing tank. If I climb the ladder I end up falling into the tank." `nicole_buruaah` investigated (reading the code, not yet reproduced in the browser) and wrote this brief. Brief only; not started until the owner says.

Read first: `CLAUDE.md` (real working components; all input and the walker's movement through `src/toolkit/controls/`; pure logic in `logic/`, tested beside it; the commit rules), `src/toolkit/controls/CLAUDE.md` (collision, walkable footprints), `doc/room-layout-guide.md`, `doc/agent-tooling.md` (look links: `?room=plant_pool_01&look=PL1-T1&mode=left`). Claim files on agent-inbox; stage only your own hunks through a private index; don't spawn sub-agents without the owner's permission.

## What there is now (read 2026-11-03)

- **The tank:** PL1-T1, the Lounge's sectional balance tank (`plant_pool_01|balance-tank:3x2x2`), drawn by the plant room's equipment (`src/toolkit/components/plant/views/blockout.ts`, about line 149, `createHumanLadder('caged', tank.top + 0.05)`; the main pool's tank in `balance-plant.ts`, about line 238, the same). Its roof carries the access hatch and, on some, a level transmitter.
- **The ladder** (`src/toolkit/components/architectural/views/human-ladder.ts`): a `caged` ladder's zone joins the floor to its top (`humanLadderZones`, `ladder-zone.ts`); at the top it builds a short guarded service landing, a 1.18 × 0.9 m deck with side and end guards, beside the ladder on its `topExit` side (about lines 103–125).
- **What the walker can stand on** (`floorAt` in `src/toolkit/gallery/rooms/plant-room-shell-room.ts`, about line 380, and the same in `rooms/plant-room.ts`, about line 694): only that landing (`humanLadderLandingAt`: within 0.52 × 0.4 m of the ladder's `topExit`, and only from at or above its height) or the shell's own floors (`shellFloorAt`: the plant floor, the deck, the stair). **The tank's roof is not a walkable surface anywhere.**
- **What stops the walker:** while on the landing, the room's solids drop `equipmentWalls` (`onLadderLanding || aloft(…) ? [] : equipmentWalls`) and add only the landing's own guards (`humanLadderLandingSolids`). So a step off the landing toward the roof leaves the landing's footprint, `floorAt` falls back to the plant floor, and the walker drops through the roof, inside the tank's walls. That is the fall the owner sees; the landing's guards may also not close the side facing the tank, or the landing may stand off the roof rather than over it.

## What to build (normal practice first)

Find and record the normal practice for access to the roof of a sectional (GRP or steel panel) balance tank in a UK plant room: usually a fixed ladder with a safety cage to the roof, a roof that is walkable for maintenance (sectional tank roofs are rated for foot traffic, with a hatch) and edge protection (guardrails per BS EN ISO 14122-3, or a walkway with handrails on the roof), or a separate access platform beside the tank. Then:

1. **A walkable roof, with edge protection:** the tank's roof becomes a walkable surface at its height (a new kind of walkable floor the room's `floorAt` consults: footprints with a height, contributed by equipment such as tanks, tested in `logic/`), with guardrails round its edge (solids while on the roof), so the walker who climbs the ladder can step onto the roof, walk to the hatch and the level transmitter, and come back to the ladder. Or, if research says the normal fitting is a platform and not the roof, a platform the walker stands on beside the hatch; record the choice.
2. **Getting on and off:** the ladder's top exit leads onto the roof (or platform); the landing and the roof meet without a gap; leaving the roof is only by the ladder (no falling off its edge).
3. **Generic, not one tank:** make it work for every caged ladder that serves a tank roof (`blockout.ts`'s tanks, `balance-plant.ts`, and check the other `createHumanLadder('caged', …)` users such as `rooms/plant/services.ts`), so a tank with a ladder always has a roof to stand on.
4. **The hatch:** if the roof hatch is drawn (`balance-plant.ts`, about line 150), it is reachable from the roof; whether it opens is a separate matter (note it in `TODO.md` if it is static, by the working-components rule).

## Tests and checks

- Pure: the walkable-surface lookup returns the roof's height over the roof's footprint for a walker coming from the landing or the roof, and the floor elsewhere; edge guards are solids while on the roof.
- In the browser, in plant room 1 (start from `?room=plant_pool_01&look=PL1-T1&mode=left`, or the ladder's own look link): climb the ladder, step onto the roof, walk to the hatch, walk to each edge (stopped by the guard), return to the ladder, climb down. Repeat on another tank with a caged ladder. Record them in the plan, with screenshots.
- `npm run typecheck`, `npm run lint`, `npm run format:check`, the targeted tests (`--maxWorkers=2`), `npm run build`, then one full `npm test` announced on agent-inbox (one full run per machine).

## Records

The plan in `doc/plans/151-balance-tank-roof-access.md`; the CHANGELOG under Unreleased (`### Fixed`); `TODO.md`: this mission, ticked with its date and commit, and any follow-ups (the hatch working).
