# 159: One room factory, behaviour unchanged

The owner, 2026-11-04. Part of the one-kind-of-room series (158–165); priority **urgent**. Brief only; not started until the owner says. Read `CLAUDE.md` and mission 158 first, whose decisions (the registry as gateway, solidity, carrying flags, seats, room styles) this mission follows.

**Needs:** 158 stage 1 (the flags).

## What it is

Every room builder's `createFirstPerson({...})` call (42 call sites in 41 starter files) goes through one room factory used by the starters that `main.ts` opens, with the magic room included. Each room's current options are passed through as they are, so nothing changes for the player yet; this gives 160–164 one place to land. Room styles (158 decision 6) have a hook here, unused.

## Findings

- `src/main.ts:917-1223` chooses lazy room starters; `mount()` at 1234-1257 calls `start(surface)` and caches the returned handle. `openRoom()` at 1742 and 1890 calls `mount()`; `runMagicRoom()` is a separate `bench.html?bench=magic-room&kind=<kind>` entry in `src/toolkit/gallery/views/magic-room.ts:61,85,478`. `main.ts` does not call `createFirstPerson` directly, so a wrapper at `mount()` alone cannot replace starter options.
- There are 35 gallery call sites (`lift-rooms.ts:581,874` has two), seven in `src/rendering/` (for example `shared-plant-layout.ts:415`, `poolrooms-world.ts:1746`), and one gallery magic call among the 35: 42 total. Each passes a different mix of `FirstPersonOptions` (`first-person.ts:208-281`), with `use` required. Migrate all 42, not only files under `gallery/rooms/`.
- Existing tests to keep green include `src/toolkit/controls/input/first-person.test.ts`, `src/toolkit/gallery/logic/{shell-rooms,plant-rooms}.test.ts`, and `src/toolkit/gallery/logic/magic-page.test.ts`.

## Approach

1. Add a single `createRoomController(options)` entry adjacent to `first-person.ts`; at this stage delegate every option unchanged to `createFirstPerson`, with a typed, unused room-style slot owned by the factory.
2. Change the 42 starter calls in bounded groups (shared shell/plant, pool and museum, experiments/rendering, magic); keep each starter's scene construction, callbacks, handle and frame loop intact. Route `main.ts`'s starter/mount seam through the factory contract without duplicating controller construction.
3. Add a fast source/registry guard for remaining direct imports/calls and smoke the five named rooms. Compare click, cue, inspection, carry and movement before and after, especially the two `lift-rooms.ts` calls.

## Risks

- Replacing callback order in `first-person.ts:364-397` changes ladder, carry and use precedence. The adapter must preserve it verbatim in this push. Magic-room entry and title/attract starters bypass normal room opening and need explicit coverage.

## Open questions for the owner

None; mission 158 fixes the shared behaviour, and this mission preserves it.

## Acceptance

- All 42 direct starter calls use the factory; a fast guard finds no bypass, including the magic and rendering starters. `main.ts`'s `mount()` still caches one handle per room key.
- A smoke check of a pool hall, a plant room, the main corridor, dev0 and a magic room shows them unchanged.
- The full test suite passes; nothing changes that this brief does not name.

## Coordination

Touches `first-person.ts`, `main.ts`'s room opening and every room builder: claim on the mailbox and migrate in batches others can see.

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased; `doc/agent-tooling.md` where a tool changes; a diary entry.
