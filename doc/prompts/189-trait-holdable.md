# 189: The `holdable` trait in code

The owner, 2026-11-04. Brief only; not started until the owner says. One of a series, one mission per trait (177–201), defining in code what each trait means for gameplay. Read `doc/plans/172-trait-hierarchy.md`, `src/game/plant/traits.ts` (`PRIMITIVES`) and the trait pages (mission 174) first. This brief is a creative first definition: the implementing agent refines it with the owner, one question at a time.

**The rule (the owner, 2026-11-04):** every trait exists for a plausible gameplay reason; a trait says what is exceptional about a kind of object. If no gameplay reason survives the design, propose retiring the trait instead of implementing it.

## The trait

- **Facet:** handling.
- **What it means:** You can hold it and take it to places (the owner, 2026-11-04, correcting an earlier mistranscription about tethering and rotating).
- **Gameplay reason:** Things travel with the player: test kits, sample bottles, tools and boxes can be picked up, held, and taken where they are needed.

## What to implement

- Pick-up: held in front of the camera while the player moves.
- Put-down on any supportable surface or the floor.
- Its mass and centre of gravity from its form, for how it sits when put down.
- Behaviour comes from the trait, never from per-kind or per-room code: a kind gains it by `npm run -s audit -- set <kind> traits+=holdable` and nothing else.

**Metadata it implies:** `mass` (kg, optional).

## Acceptance

- The behaviour above works for every kind with the trait (one or two worked examples from the trait's page, `bench.html?bench=trait-audit&trait=holdable`), and for none without it.
- Pure parts in `logic/` with tests; the trait's description in `PRIMITIVES` updated to say what it does in the game.
- `doc/agent-tooling.md`'s "Rules for objects" says what the trait does.

## Open questions for the owner

- The owner's definition was cut off after 'take it to places and…': complete it before implementing.

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased; a diary entry.
