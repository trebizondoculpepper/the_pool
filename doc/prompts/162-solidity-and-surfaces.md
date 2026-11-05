# 162: Solidity and surfaces in every room

The owner, 2026-11-04. Part of the one-kind-of-room series (158–165); priority **high**. Replanned 2026-11-05 (nicole_buruaah, at the owner's request): most of the original brief has since been designed or built by missions 175 (derived surfaces), 181 (`supportable`), 182 (`walkable`) and 208 (bounds models and the `solid` trait). What is left is the room-wide half: making every room's walker and hands take their solids and tops from the registry through the room factory, instead of each room's own lists. **Ready to start after 208 stage 2.**

**Needs:** 159 (done) and **208 stage 2** (the `solid` trait, its opt-outs and collision shapes from bounds models: open, designed with the owner).

## What it is now

Every registered kind's traits decide, in every room, whether it blocks the walker (`solid`, opt-out by `open-frame` and the like, 208), whether things put down rest on it (`supportable`, 181) and whether the walker can stand on it (`walkable`, 182); where its sides and top are comes from its bounds model or its derived body (175, 208). The room factory (`createRoomController`) feeds the walker's `solids` and `floorAt` and the hands' `supports` and `carrySolids` from those traits, so a room never lists its own equipment's footprints or tops again. Rooms keep only their fabric (walls, floors, doorway cuts), which is not equipment. The 1 m drop rule (`CLAUDE.md`) holds at every walkable top's edges.

## What is already done (checked 2026-11-05 at `74424dd1`)

- **Tops things rest on** come from traits in every room: `RoomTraits.supports` (`gallery/views/room-traits.ts`), derived from `derived-surfaces.ts` (rays down on the body, or the bounds model's tops, 208 stage 1), merged by `createRoomController` with any room supports.
- **Tops the walker stands on** are derived (walkable kinds) in only two starters, `plant-room.ts` and `plant-room-shell-room.ts`, through `roomSurfaces`; the other rooms with raised floors (`tank-hall-room`, `pool-room`, `shell-room`, `pool-hall-room` and others: 22 sources pass `floorAt`) still give their own. `no-special-surface-rules.test.ts` already forbids marker meshes and named lookups.
- **What blocks the walker** is still each room's `solids` footprints (`controls/logic/walk-collision.ts`: 2D `Footprint`, `slide`). Nothing derives a solid from a kind yet; that is 208 stage 2.
- **What stops a carried thing** is the room's `carrySolids` (three rooms), and 211's throw rebounds off the walker's `solids`.

## Approach

1. **After 208 stage 2:** add `RoomTraits.solids(root, metre)` beside `supports`: each placed solid object's collision shape from its bounds model (or fitted box), cut to the walker's height band (so overhead pipework and a tank top the walker stands on do not block), as walk footprints. The factory merges them with the room's fabric solids, as it does supports.
2. **Walkable tops everywhere:** move `roomSurfaces`' walkable tops into the factory (`RoomTraits.floors`), so every room's `floorAt` includes them, with the 1 m edge rule at their unladdered edges; remove the two starters' private wiring.
3. **Migrate the rooms in batches:** for each room, delete the footprints and floor patches its registered equipment now provides, keeping fabric and doorway cuts; check by walking it (a test per batch comparing the old and new footprints where practical).
4. **Carried things and throws** take the same derived solids (`carrySolids` and 211's rebounds), so a box cannot be pushed into a boiler's side.

## Risks

- The walker's collision is 2D: a solid must be cut to the band between the walker's feet and head at its current floor, or a tank top would block the walker standing on it.
- Animated or open machines (a cabinet with its door open, a drawer) need their shape updated or an opt-out trait; 208's open questions cover `open-frame` and `hollow`.
- Doorway cuts must stay effective; fabric stays the room's.

## Open questions for the owner

None of its own: the open questions are 208's (extend the `form` facet or add a bounds facet; whether `run-like` stays walk-through; whether bounds retire `supportable`'s `plane` meta), to settle there first.

## Acceptance

- A boiler, a desk and a tank block the walker and a carried thing at their sides, in every room, with no footprint written by the room; an `open-frame` table does not; overhead non-solid pipework does not.
- A ladder-reached tank roof holds the walker in every room it stands in, and stops a drop over 1 m at its unladdered edges; a doorway stays passable.
- No room lists solids or floor patches for registered equipment; the derivation is pure logic in `logic/`, tested.
- The full test suite passes; nothing changes that this brief does not name.

## Coordination

- Waits for 208 stage 2 (ahnaa_dmitrieva did stage 1; check who takes stage 2). Touches `room-traits.ts`, `room-controller.ts` (sayuri_shantian holds it for 161, 2026-11-05), `walk-collision.ts`, `derived-surfaces.ts` and the room starters: claim on the mailbox, migrate in visible batches.
- No `WORLD_VERSION` change.

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased; `doc/agent-tooling.md` ("Rules for objects": solidity from traits); a diary entry.
