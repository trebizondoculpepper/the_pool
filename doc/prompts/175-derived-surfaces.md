# 175: Derived surfaces: walkable and supportable objects find their own top plane

The owner, 2026-11-04, discussing the balance tank's walkable roof: the plane a walkable or supportable object offers should, by default, be worked out from its geometry, not hand-placed; the trait says _whether_ (`supportable`: things can be put on it; `walkable`: the player can walk on it, which implies supportable), and the derivation says _where_, for the player and for things that fall alike. Surface-finding is its own mechanism, not trait configuration: a trait override (an anchor, a fixed height) comes into the trait system only later, when some object needs to behave exceptionally. `nicole_buruaah` investigated and wrote this brief. Brief only; not started until the owner says. It follows mission 170 (which assigns traits) and can start with the balance tank, already classified by 174.

Read first: `CLAUDE.md` (the walker never drops more than 1 m; pure logic in `logic/`, tested beside it; all movement through `src/toolkit/controls/`; the commit rules), `src/toolkit/controls/CLAUDE.md` (collision, walkable footprints, carrying and its drop), `doc/agent-tooling.md`, `doc/plans/151-balance-tank-roof-access.md`, `doc/plans/172-trait-hierarchy.md`. Claim files on agent-inbox; stage only your own hunks through a private index; don't spawn sub-agents without the owner's permission.

## Prior art (researched 2026-11-04)

Games mostly derive walkable surfaces from simple collision geometry rather than authoring them: a navigation-mesh generator (Recast, in Unreal and Unity) marks upward-facing collision triangles flatter than the agent's walkable slope, with headroom and within a step height, as walkable, with per-object or per-volume overrides (Unity's NavMesh Modifier and Modifier Volume; Unreal's walkable floor angle with a per-surface Walkable Slope Override). Authored markers are the exception path: The Sims' slots (named places with a size, distinct from an object's footprint and routing shape), Unreal's sockets and Smart Objects. So: derive by default, from the object's body not its decoration; author a marker only where derivation fails.

## The check that it works (2026-11-04)

On PL1-T1, plant room 1's balance tank, built in the browser (`createRoomEquipment(kit, 'plant_pool_01')`), 1,681 rays cast straight down on a 41 × 41 grid over its bounds, counting the first visible upward-facing face (normal y > 0.9) and excluding 151's roof-deck marker, the ladder and the guards: **2.25 m for 932 hits (84 %): the roof panels**; 2.30–2.31 m for 121 (the roof's flanges and the hatch, 5–6 cm proud); 1.26 m for 35 (a ledge on its side); 0.25 m for 12 (base and supports); 576 misses (outside the tank: the ladder widens its bounds). The derived plane, 2.25 m, is exactly where 151's hand-placed marker puts it; the tank's top point (3.4 m, the ladder cage) does not fool it.

## What there is now

- **The walker** stands on what the room's `floorAt` returns (`src/toolkit/gallery/rooms/plant-room-shell-room.ts` and `rooms/plant-room.ts`): the shell's floors, the ladder's landing, and, for tank roofs, 151's roof decks (`src/toolkit/gallery/logic/walkable-deck.ts`, fed by `roomRoofDecks` from `addWalkableTankRoof` in `components/plant/views/balance-plant.ts`: an invisible, opacity-0 "Tank roof deck" mesh at the roof's height, plus an edge-stop).
- **Things that fall** (`src/toolkit/controls/input/object-handling.ts`, `groundAt`, about line 793) settle on the highest of the room's **supports** below them (rectangles with a `top`, from `fixedSupports` and the room's `supports()`), or on the floor.
- **Traits** (`src/game/plant/traits.ts`): `supportable` and `walkable` are surface primitives (walkable implies supportable); kinds name them in `src/game/plant/kinds/<kind>.ts`, set only through `npm run -s audit -- set`.

## What to build

1. **A pure derivation** (`src/toolkit/gallery/logic/derived-surface.ts` or beside the walk collision; tested): given an object's **body** (its meshes, with ladders, cages, guards, rails, signs and other declared non-body parts excluded) and its footprint, sample downward rays on a grid; take the dominant upward-facing height (the mode, at a tolerance of a few millimetres) as the plane; count anything within a step (about 0.3 m) above it as part of it (flanges, a hatch); the surface is the footprint the plane covers (a rectangle in the room, or a few where the top is stepped). Report its coverage and confidence. The ray casting is the only part touching Three.js and lives in `views/`; the clustering and the result are pure and tested on synthetic samples.
2. **What is body:** builders mark non-body parts (the caged ladder, guards, cages, rails, signs, instruments on top) with one shared mark, or the derivation excludes them by the component identities they already carry; decide which, and record it. The tank's guardrails and ladder must not count.
3. **For every walkable or supportable kind:** when a room builds (and in the audit), derive each such object's surface once, and give it:
   - to **the walker**: the room's `floorAt` holds the walker at the plane over its surface (from the plane's height or from at most a step below), and its edges stop the walker wherever the drop beyond is more than 1 m (the owner's rule), with any guardrail the object really has (151's) still a solid;
   - to **things that fall**: the surface is a support (`supports()`) at the plane's height, so a dropped spanner rests on the tank's roof at 2.25 m.

   Objects that are neither trait offer no surface (things fall past them or are blocked by them as solids, as now).

4. **Replace 151's marker:** the balance tank's roof comes from derivation; `addWalkableTankRoof`'s invisible deck mesh and its special lookup go, keeping its guardrails. The behaviour must be unchanged for the player: climb, step off, walk about, stopped at the edges, never into the tank.
5. **Visible in the audits:** the item audit (and 174's trait pages for `walkable` and `supportable`) show each kind's derived plane: its height, coverage and confidence, and a warning where the derivation is weak (no dominant plane, low coverage, a body that couldn't be told from decoration). That warning is the cue to add an exception later (an anchor or fixed height through the trait system, when the owner asks for it).
6. **Not in this mission:** the exception mechanism itself (anchors, fixed heights as trait configuration); NPC routing; slopes.

## Tests and checks

- Pure: synthetic samples (a flat desk; a tank roof with proud flanges and a hatch; a stepped top; a body with too little coverage) give the right plane, surface and confidence.
- Room-level: building plant room 1, PL1-T1's derived surface is at 2.25 m (±0.01) over its roof's footprint, the ladder and guards excluded; a walker stepping off the ladder, walking the roof for many frames in every direction, and at every edge and corner, never drops below it; a dropped object over the roof rests on it.
- In the browser (a person at the controls, or ahnaa_dmitrieva's real browser on the Pro): climb PL1-T1, walk about, drop something on the roof; screenshots or a short recording in the plan.
- `npm run typecheck`, `npm run lint`, `npm run format:check`, the targeted tests (`--maxWorkers=2`), `npm run build`, then one full `npm test` announced on agent-inbox (one per machine).

## Records

The plan in `doc/plans/175-derived-surfaces.md`; the CHANGELOG under Unreleased (`### Changed`); `TODO.md`: this mission, ticked with its date and commit, and the exception mechanism as a later item; `doc/agent-tooling.md` if the audits change; `src/toolkit/controls/CLAUDE.md` for the walker's and the drop's surfaces.
