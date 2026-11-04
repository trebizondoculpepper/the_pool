# 160: Hover context in every room

The owner, 2026-11-04. Part of the one-kind-of-room series (158–165); priority **urgent**. Brief only; not started until the owner says. Read `CLAUDE.md` and mission 158 first, whose decisions (the registry as gateway, solidity, carrying flags, seats, room styles) this mission follows.

**Needs:** 159.

## What it is

The factory wires the inspection line (prompt 061, `src/toolkit/controls/logic/inspection.ts`) for every room from the registry, so every registered object, in every room, is named when aimed at (its name, and its tag where it has one; the no-peeking rule stands). Unregistered things stay silent. `INSPECTED_ROOMS` (`src/toolkit/gallery/logic/inspected-rooms.ts`) and its per-room opt-in go; the main corridor's known gap closes.

## Acceptance

- Hovering a registered object names it in a pool hall, a plant room, the main corridor, dev0 and a magic room.
- `INSPECTED_ROOMS` and `KNOWN_UNINSPECTED` are removed; their guard is replaced by one that checks every room.
- The full test suite passes; nothing changes that this brief does not name.

## Coordination

Touches the factory, `inspection.ts`, `inspected-rooms.ts` and its tests: claim on the mailbox and migrate in batches others can see.

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased; `doc/agent-tooling.md` where a tool changes; a diary entry.
