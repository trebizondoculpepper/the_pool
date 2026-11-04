# 175 plan (as built): derived surfaces, with 181 (supportable) and 182 (walkable)

Brief: [175](../prompts/175-derived-surfaces.md), with [181](../prompts/181-trait-supportable.md) and [182](../prompts/182-trait-walkable.md). Built by ahnaa_dmitrieva, 2026-11-04, on the owner's word: "get rid of those hand-based rules. They are terrible and they don't work", raycasting the default way of implementing walkable, and the trait system there so a kind can switch to an alternative (a fixed y plane), and a guard against special rules.

## What was built

- **The trait decides whether, the geometry where.** `supportable` (and `walkable`, which implies it) gained two metadata settings: `surface` (`raycast`, the default, or `plane`) and `surfaceY` (with `plane`: the top's height in the object's own frame). Set per kind with `npm run -s audit -- set <kind> surface=plane surfaceY=2.25`.
- **Pure derivation** (`src/toolkit/gallery/logic/derived-surface.ts`, tested): `deriveSurface` takes downward ray samples and finds the dominant upward-facing height (the mode at 1 cm), counting anything within 0.3 m above it as part of it (flanges, a hatch), and the footprint it covers, with coverage and a `good`/`weak` confidence; `surfaceAt` (the walker stands on a walkable top when already up at it, never stepping up from the floor), `surfaceUnder`, `edgeSolids` (thin stops round a top wherever the drop is over 1 m: the owner's rule) and `surfaceSupports` (for dropped things).
- **Ray casting** (`src/toolkit/gallery/views/derived-surfaces.ts`): for every placed object whose kind's traits include supportable, rays on a 0.1 m grid (at most 80 × 80) straight down on its body; `roomSurfaces(root, metre)` derives a room's surfaces once (11 ms for plant room 1). Placed objects carry their kind (`markEquipmentKind`, set in `createRoomEquipment`).
- **What is body:** one shared mark, `markNonBody` (`src/toolkit/components/core/views/non-body.ts`), set by the builders of ladders (`createHumanLadder`) and guard rails (`createGuardRail`); the derivation never finds a top on them.
- **The rooms** (`plant-room.ts`, `plant-room-shell-room.ts`): `floorAt` uses the ladder's landing, then `surfaceAt` over the derived surfaces; the solids add `edgeSolids` of the surface the walker stands on; `supports()` gives every supportable top to things that fall.
- **Removed:** 151's invisible "Tank roof deck" marker, `roomRoofDecks`, `tankRoofAt`, `tankRoofGuardSolids`, the 0.4 m padding and `logic/walkable-deck.ts`. `addWalkableTankRoof` became `addTankRoofGuards` (the guard rails stay, as the real plant has them).
- **The guard:** `src/toolkit/gallery/logic/no-special-surface-rules.test.ts` fails on a named roof-deck marker, the old special-rule functions, a walking surface found by an object's name, or a floor rule naming a kind; and the rule is in `AGENTS.md`.
- **Traits:** `break-tank` and `backwash-tank` given `tank-like, walkable` through the command (mission 170's approved walkable-roof members; `balance-tank` already had it from 174).

## Checks

- Plant room 1 (PL1-T1): the roof derived at 2.250 m, coverage 1.00, `good`, footprint the roof's (the ladder's cage excluded), exactly where 151's marker was.
- Tests: the pure derivation (a desk, a tank roof with proud flanges, a hatch and a tall cage beside it, sparse coverage, nothing hit); in plant room 1 and the wet hall, every point of the laddered tank's roof holds a walker already up there, nobody is lifted to it from the floor, the ladder's top exit is on the roof, and its edges stop the walker.
- Not checked by hand in the browser yet (the owner was away): climbing PL1-T1 and walking about it.

## Not done (later)

- The Olympic's tank hall walks on its room architecture (`tankHallFloorAt`), not a placed object's top: unchanged.
- 181's fit rule (refusing a put-down that overhangs a top by more than half) and 182's material footsteps.
- Showing each kind's derived plane on the item audit and the trait pages (175 step 5).
