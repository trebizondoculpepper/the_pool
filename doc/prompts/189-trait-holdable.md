# 189: The `holdable` trait in code

The owner, 2026-11-04. Brief only; not started until the owner says. One of a series, one mission per trait (177–201), defining in code what each trait means for gameplay. Read `doc/plans/172-trait-hierarchy.md`, `src/game/plant/traits.ts` (`PRIMITIVES`) and the trait pages (mission 174) first. This brief is a creative first definition: the implementing agent refines it with the owner, one question at a time.

**The rule (the owner, 2026-11-04):** every trait exists for a plausible gameplay reason; a trait says what is exceptional about a kind of object. If no gameplay reason survives the design, propose retiring the trait instead of implementing it.

## The trait

- **Facet:** handling.
- **What it means:** Picked up and carried (the owner's 'carryable').
- **Gameplay reason:** Things travel with the player: test kits, sample bottles, tools and boxes can be taken where they are needed. The owner: you can pick it up, and when examined it rotates in the hand; you can move it around and lift it off the y = 0 plane, always tethered to the ground (put back down, never left floating).

## What to implement

- Pick-up: held in front of the camera; examine mode rotates it in the hand.
- Put-down on any supportable surface or the floor; never left in the air (tethered to the ground: dropped, it falls to the nearest surface below).
- Its mass and centre of gravity from its form, for how it sits when put down.
- Behaviour comes from the trait, never from per-kind or per-room code: a kind gains it by `npm run -s audit -- set <kind> traits+=holdable` and nothing else.

**Metadata it implies:** `mass` (kg, optional).

## Acceptance

- The behaviour above works for every kind with the trait (one or two worked examples from the trait's page, `bench.html?bench=trait-audit&trait=holdable`), and for none without it.
- Pure parts in `logic/` with tests; the trait's description in `PRIMITIVES` updated to say what it does in the game.
- `doc/agent-tooling.md`'s "Rules for objects" says what the trait does.

## Open questions for the owner

- Is 'always tethered to the ground' that it falls to the nearest surface when released, or that it cannot be raised above a height while held?

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased; a diary entry.
