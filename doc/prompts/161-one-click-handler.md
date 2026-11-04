# 161: One click handler

The owner, 2026-11-04. Part of the one-kind-of-room series (158–165); priority **urgent**. Brief only; not started until the owner says. Read `CLAUDE.md` and mission 158 first, whose decisions (the registry as gateway, solidity, carrying flags, seats, room styles) this mission follows.

**Needs:** 159 (160 may land in the same push).

## What it is

A click reaches whatever the cue finds, through the registry and the components' own registration (`markUsable`/`usableOf`, `use-marking.ts`; `parts.uses`). The per-room `use` lists and raycasts, and the eight empty `use: () => {}` (shared-plant-layout, plant-fit, ceiling-lab, white-corridor, dry-stair, pipes-n-dreams, arched-rooms, donut-pool), go. Decorative kinds never cue or use. A room's special click (the water room's ripple) becomes a registered kind in that room.

## Acceptance

- In every room, anything showing a use cue works when clicked; a test checks no cue without a use and no use without a cue.
- The pool halls' equipment, not only their fixed list, works when clicked.
- The full test suite passes; nothing changes that this brief does not name.

## Coordination

Touches `first-person.ts`, `use-marking.ts` and every room builder's `use`: claim on the mailbox and migrate in batches others can see.

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased; `doc/agent-tooling.md` where a tool changes; a diary entry.
