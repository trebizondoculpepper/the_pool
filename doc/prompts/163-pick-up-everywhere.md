# 163: Pick-up and put-down everywhere

The owner, 2026-11-04. Part of the one-kind-of-room series (158–165); priority **high**. Brief only; not started until the owner says. Read `CLAUDE.md` and mission 158 first, whose decisions (the registry as gateway, solidity, carrying flags, seats, room styles) this mission follows.

**Needs:** 162.

## What it is

Portable kinds can be picked up and put down in every room by one rule, onto any solid top they fit on (162), replacing the per-room `objects`, `allowPickup`, `heldAction` and related options. The inventory flag stays reserved, doing nothing.

## Acceptance

- A portable object can be picked up and put down on a desk, a boiler top and the floor in a pool hall, a plant room, a corridor and dev0.
- No room passes its own pick-up options.
- The full test suite passes; nothing changes that this brief does not name.

## Coordination

Touches `object-handling.ts`, `first-person.ts`'s pick-up options and the room builders that pass them: claim on the mailbox and migrate in batches others can see.

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased; `doc/agent-tooling.md` where a tool changes; a diary entry.
