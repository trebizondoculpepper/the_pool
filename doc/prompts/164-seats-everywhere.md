# 164: Seats everywhere

The owner, 2026-11-04. Part of the one-kind-of-room series (158–165); priority **low**. Brief only; not started until the owner says. Read `CLAUDE.md` and mission 158 first, whose decisions (the registry as gateway, solidity, carrying flags, seats, room styles) this mission follows.

**Needs:** 158 and 159.

## What it is

Seating comes from the kind's seat flag in every room, replacing `shell-room`'s own `declareSeat` wiring (`src/toolkit/controls/input/seating.ts`): every office chair, stool, bench and the bridge's chairs. Clicking a seat sits you at its height looking in its kind's default direction, or at the placed seat's target where one is given (a desk, a console, the BBC workstation's screen); seated you can look round and use what is in reach; moving or Esc gets you up.

## Findings

- `src/toolkit/controls/input/seating.ts:12-49` stores `SeatDeclaration` on `userData.seat` and computes a world pose; `controls/logic/seat.ts:20-95` supports height, forward offset and optional `lookAt`. Four declaration sites are `components/industrial-control/views/bbc-workstation.ts:97`, `components/site-dressing/views/engineers-desk.ts:645`, and `gallery/views/control-room-prototype.ts:1707,1733`. Only `gallery/rooms/shell-room.ts:536-550` resolves a clicked declaration to `walk.sit()`.
- `first-person.ts:1435-1461,1653-1663` already holds seated pose and stands on movement; its cue/use path has no universal seat registration. `control-room-prototype.ts:1693-1734` already gives bridge chairs heights and look targets. The existing Esc key frees pointer/menu; it does not currently call `stand()` for seating, so the brief's Esc behaviour requires an explicit change.
- Update `controls/logic/seat.test.ts`, `controls/input/first-person.test.ts` and shell/bridge/BBC room interaction tests; add coverage for any new seat kind in the approved registry.

## Approach

1. Put seat height and default orientation on approved kinds; allow a placed seat's target to override the direction while preserving `SeatDeclaration.lookAt` coordinates. Register every office chair, stool and bench that the inventory identifies.
2. Have the factory's unified click resolver recognise the seat kind and call `seatOf()`/`walk.sit()` after the shared reach/occlusion check. Remove `shell-room.ts`'s special seat branch; keep existing four declarations only as placement data during migration, then replace them with kind-backed data.
3. Wire Esc while seated to stand without breaking its pointer/menu behaviour, and test sitting, looking, nearby use, moving and Esc in shell, BBC and bridge rooms.

## Risks

- `seatOf()` assumes a chair origin at its foot and +z facing direction (`seating.ts:25-49`); differently modelled furniture needs a placement transform. A seated camera may be inside a new chair's collider, so collision must permit leaving it.

## Open questions for the owner

- Esc already frees the pointer and opens the menu; should it also stand the walker up (one key doing two things), or should moving alone stand you up, as it does now? The designer recommends moving alone, leaving Esc to the menu. Settle before step 3.

## Acceptance

- Every approved seat kind seats through the factory in every starter, including the bridge; the BBC workstation chair faces its screen, and movement or Esc stands the walker without disabling nearby controls.
- No room wires its own seating.
- The full test suite passes; nothing changes that this brief does not name.

## Coordination

Touches `seating.ts`, `shell-room.ts` and furniture views: claim on the mailbox and migrate in batches others can see.

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased; `doc/agent-tooling.md` where a tool changes; a diary entry.
