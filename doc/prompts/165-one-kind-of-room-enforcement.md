# 165: Enforcement

The owner, 2026-11-04. Part of the one-kind-of-room series (158–165); priority **after the rest**. Brief only; not started until the owner says. Read `CLAUDE.md` and mission 158 first, whose decisions (the registry as gateway, solidity, carrying flags, seats, room styles) this mission follows.

**Needs:** 160–164.

## What it is

Tests that keep it true: one walks the room registry and fails if any room is not built by the factory or lacks a capability without an owner-approved room style; another checks the registry's invariants (decoration has no cue or use, every chair kind seats, every solid kind has a top, every portable kind can be placed). `doc/agent-tooling.md` describes the rules and how to add a kind.

## Findings

- The first enforcement seams are the 42 starter calls in 41 files (all should import the factory after 159), `src/game/plant/equipment-kinds.ts:850-860` for registered kinds, `src/game/descriptors/descriptor.ts:93-113` for object kind/class, and scene marks in `controls/input/{use-marking:36,seating:12,object-handling:249-254}.ts`. A source-only room guard cannot prove a registered object is present in the rendered scene; use the existing room audit infrastructure.
- `src/toolkit/gallery/logic/inspected-rooms.slow.test.ts:36-138` currently guards only rooms with actionable parts and has a main-corridor exception. `gallery/views/inspection-coverage.slow.test.ts` plus `inspection-coverage.json` pin room coverage; `src/main.ts:917-1223` is the room starter map, while `views/magic-room.ts:85` is a separate entry. Tests to update or replace include these plus `controls/input/{first-person,use-marking,object-handling}.test.ts` and `controls/logic/walk-collision.test.ts`.

## Approach

1. Export pure validation of a kind's resolved affordances and room-style declaration; test decoration without use/cue, seats with height/direction, solid shape/top, and portable drop capability with fixtures that deliberately violate each rule.
2. Guard all starter imports and the `main.ts` room map, including rendering and magic paths, then use the existing room audit to prove each rendered registered object binds to a kind and its capabilities. An owner's approved room style must be named in the room definition; an undeclared bypass fails.
3. Replace the old inspection opt-in audit, document registration and exception workflow in `doc/agent-tooling.md`, and run the fast validator plus the existing slower scene coverage locally before the implementation commit.

## Risks

- “Every solid kind has a top” can incorrectly bless a top that is too small, sloped or unreachable; validate declared/derived geometry and fit, not merely a boolean. Scene coverage is expensive and may remain a slow audit, while the requested invariant tests stay fast.

## Open questions for the owner

None; only owner-approved styles or kind exceptions recorded under 158 qualify.

## Acceptance

- Fast kind and room-contract tests reject a deliberately broken kind and starter; the room audit covers every starter, including magic, with no unapproved behaviour bypass. Any scene-wide audit stays in the existing slow suite.
- The full test suite passes; nothing changes that this brief does not name.

## Coordination

Touches tests and docs only: claim on the mailbox and migrate in batches others can see.

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased; `doc/agent-tooling.md` where a tool changes; a diary entry.
