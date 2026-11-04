# 164: Seats everywhere

The owner, 2026-11-04. Part of the one-kind-of-room series (158–165); priority **low**. Brief only; not started until the owner says. Read `CLAUDE.md` and mission 158 first, whose decisions (the registry as gateway, solidity, carrying flags, seats, room styles) this mission follows.

**Needs:** 158 and 159.

## What it is

Seating comes from the kind's seat flag in every room, replacing `shell-room`'s own `declareSeat` wiring (`src/toolkit/controls/input/seating.ts`): every office chair, stool, bench and the bridge's chairs. Clicking a seat sits you at its height looking in its kind's default direction, or at the placed seat's target where one is given (a desk, a console, the BBC workstation's screen); seated you can look round and use what is in reach; moving or Esc gets you up.

## Acceptance

- Every chair kind seats, in every room; the BBC workstation's chair still faces its screen.
- No room wires its own seating.
- The full test suite passes; nothing changes that this brief does not name.

## Coordination

Touches `seating.ts`, `shell-room.ts` and furniture views: claim on the mailbox and migrate in batches others can see.

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased; `doc/agent-tooling.md` where a tool changes; a diary entry.
