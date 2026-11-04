# 192: The `operable` trait in code

The owner, 2026-11-04. Brief only; not started until the owner says. One of a series, one mission per trait (177–201), defining in code what each trait means for gameplay. Read `doc/plans/172-trait-hierarchy.md`, `src/game/plant/traits.ts` (`PRIMITIVES`) and the trait pages (mission 174) first. This brief is a creative first definition: the implementing agent refines it with the owner, one question at a time.

**The rule (the owner, 2026-11-04):** every trait exists for a plausible gameplay reason; a trait says what is exceptional about a kind of object. If no gameplay reason survives the design, propose retiring the trait instead of implementing it.

## The trait

- **Facet:** use.
- **What it means:** Has working controls (knobs, switches, valves, buttons).
- **Gameplay reason:** The plant is played through its controls: an operable thing shows the use cue and responds to clicks through the one click handler (mission 161), the same in every room.

## What to implement

- The use cue and the click route to its controls (the registered parts), in every room.
- Its controls listed on the item audit and by `show`.
- Decorative never operable (already enforced).
- Behaviour comes from the trait, never from per-kind or per-room code: a kind gains it by `npm run -s audit -- set <kind> traits+=operable` and nothing else.

**Metadata it implies:** none

## Acceptance

- The behaviour above works for every kind with the trait (one or two worked examples from the trait's page, `bench.html?bench=trait-audit&trait=operable`), and for none without it.
- Pure parts in `logic/` with tests; the trait's description in `PRIMITIVES` updated to say what it does in the game.
- `doc/agent-tooling.md`'s "Rules for objects" says what the trait does.

## Open questions for the owner

- None.

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased; a diary entry.
