# 166: A retired flag for objects and rooms

The owner, 2026-11-04. Brief only; not started until the owner says. Read `CLAUDE.md`, mission 158 (the registry flags) and the audit missions it touches (126 catalogue, 129 room audit, 130 item audit, 136 brand audit, 138 simulation graph audit, the look audits in `doc/agent-tooling.md`).

## What it is

A kind (a thing in the object registry) and a room may be marked **retired**: obsolete, kept only for history, with a short reason and the date it was retired. Retired things are excluded from auditing.

- **On kinds:** a flag in the object registry (`src/game/plant/equipment-kinds.ts`, `src/game/descriptors/`), beside 158's affordance flags.
- **On rooms:** a flag in the room registry (`src/toolkit/gallery/logic/dev-room-links.ts` and the room definitions).
- **Excluded from audits:** the registry census (158), the catalogue (126), the room and item audits (129, 130), the brand audit (136), the simulation graph audit (138), the look audits, and the one-kind-of-room enforcement (165). An audit may list retired things apart, collapsed, so the exclusion stays visible.
- **Not the same as deprecated** (130): a deprecated kind is still in use and to be replaced, and audits report it; a retired one is out of scope.

## Open questions for the owner

- Does a retired room stay reachable (in `?dev`, by its link) or is it hidden from the player and the catalogue's room list?
- May a retired kind still be placed in a room, or does placing one count as an error?

## Acceptance

- Kinds and rooms can be marked retired with a reason and date; the flag is typed and tested.
- Each audit named above skips retired things and shows a collapsed count of what it skipped.
- `doc/agent-tooling.md` says how to retire something.

## Coordination

Touches the object registry (shared with 158, which another agent may be implementing: coordinate on the mailbox) and the audit modules. Can follow 158 stage 1.

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased once built; a diary entry.
