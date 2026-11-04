# 159: One room factory, behaviour unchanged

The owner, 2026-11-04. Part of the one-kind-of-room series (158–165); priority **urgent**. Brief only; not started until the owner says. Read `CLAUDE.md` and mission 158 first, whose decisions (the registry as gateway, solidity, carrying flags, seats, room styles) this mission follows.

**Needs:** 158 stage 1 (the flags).

## What it is

Every room builder's `createFirstPerson({...})` call (41 of them, `src/toolkit/controls/input/first-person.ts`) goes through one room factory that `main.ts` uses when opening any room, dev rooms, experiment rooms and magic rooms included. Each room's current options are passed through as they are, so nothing changes for the player yet; this gives 160–164 one place to land. Room styles (158 decision 6) have a hook here, unused.

## Acceptance

- Every room is opened through the factory; the 41 direct `createFirstPerson` calls are gone or listed with a reason.
- A smoke check of a pool hall, a plant room, the main corridor, dev0 and a magic room shows them unchanged.
- The full test suite passes; nothing changes that this brief does not name.

## Coordination

Touches `first-person.ts`, `main.ts`'s room opening and every room builder: claim on the mailbox and migrate in batches others can see.

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased; `doc/agent-tooling.md` where a tool changes; a diary entry.
