# 163: Pick-up and put-down everywhere

The owner, 2026-11-04. Part of the one-kind-of-room series (158–165); priority **high**. Brief only; not started until the owner says. Read `CLAUDE.md` and mission 158 first, whose decisions (the registry as gateway, solidity, carrying flags, seats, room styles) this mission follows.

**Needs:** 162.

## What it is

Portable kinds can be picked up and put down in every room by one rule, onto any solid top they fit on (162), replacing the per-room `objects`, `allowPickup`, `heldAction` and related options. The inventory flag stays reserved, doing nothing.

## Findings

- `src/toolkit/controls/input/first-person.ts:228-269,341-380` creates handling only when `objects` exists, before invoking room `use`. Twenty starter sites under `src/toolkit/gallery/rooms/` and `src/rendering/` pass `objects`; `shell-room.ts:739-760` restricts it to the engineers' office. `object-handling.ts:19-25,249-254,544-600` currently requires `userData.portable` with a `PortableObject` component and checks its `attachment`/`canPickUp`, independent of a kind flag.
- Placement first looks for `userData.placementTarget` or `placementSurface` (`object-handling.ts:320-341`), then falls or uses `boardSupport`/`supports` (`:163-175,790-803`). Existing room exceptions include shell-office release/cue (`shell-room.ts:740-760`), museum interlocks (`museum-hall-room.ts:334-345`), film lockout (`skimmer-reveal-room.ts:482-503`), and bin/toss paths (`bin-room.ts:291-326`, `repair-room.ts:639-667`). They need object-owned equivalents, not silent removal.
- Update `object-handling.test.ts`, `object-handling-resolve.test.ts`, `controls/logic/portable-board.test.ts`, and room tests for office/museum/film/bin handling.

## Approach

1. Make the factory pass the room scene as `objects` everywhere and derive pickup permission from the approved kind's portable flag plus the object's live attachment/interlock state. Keep `inventory` inert.
2. Replace per-room pickup, feedback, held-action and divert hooks with kind/object-owned targets and stateful policies; preserve the existing feedback/click priority and bin, socket, carton, film and office behaviours.
3. Use 162's derived top/side geometry for placement fit and falling support; reject overlap or a side hit. Migrate the 20 current `objects` sites and the remaining starters, then remove room-specific carry options with a source guard.

## Risks

- A portable flag alone cannot create the required `PortableObject` lifecycle or drop profile (`object-handling.ts:19-25`, `controls/logic/drop-profile.ts:64-81`). The factory must bridge approved kinds to real components; installed equipment must retain its release interlocks and world actions.

## Open questions for the owner

None beyond 158's inventory decisions about which kinds are portable.

## Acceptance

- A portable object can be picked up and put down on a desk, a boiler top and the floor in a pool hall, a plant room, a corridor and dev0.
- All starters use factory-supplied handling; no room passes `objects`, `allowPickup`, `heldAction`, `targetFeedback`, `divert` or their related carry options. Existing interlocked objects still refuse pickup until their object state permits it.
- The full test suite passes; nothing changes that this brief does not name.

## Coordination

Touches `object-handling.ts`, `first-person.ts`'s pick-up options and the room builders that pass them: claim on the mailbox and migrate in batches others can see.

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased; `doc/agent-tooling.md` where a tool changes; a diary entry.
