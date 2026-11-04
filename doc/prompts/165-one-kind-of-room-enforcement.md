# 165: Enforcement

The owner, 2026-11-04. Part of the one-kind-of-room series (158–165); priority **after the rest**. Brief only; not started until the owner says. Read `CLAUDE.md` and mission 158 first, whose decisions (the registry as gateway, solidity, carrying flags, seats, room styles) this mission follows.

**Needs:** 160–164.

## What it is

Tests that keep it true: one walks the room registry and fails if any room is not built by the factory or lacks a capability without an owner-approved room style; another checks the registry's invariants (decoration has no cue or use, every chair kind seats, every solid kind has a top, every portable kind can be placed). `doc/agent-tooling.md` describes the rules and how to add a kind.

## Acceptance

- Both tests run in the fast suite and fail on a deliberately broken room and kind.
- The full test suite passes; nothing changes that this brief does not name.

## Coordination

Touches tests and docs only: claim on the mailbox and migrate in batches others can see.

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased; `doc/agent-tooling.md` where a tool changes; a diary entry.
