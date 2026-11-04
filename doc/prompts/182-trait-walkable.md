# 182: The `walkable` trait in code

The owner, 2026-11-04. Brief only; not started until the owner says. One of a series, one mission per trait (177–201), defining in code what each trait means for gameplay. Read `doc/plans/172-trait-hierarchy.md`, `src/game/plant/traits.ts` (`PRIMITIVES`) and the trait pages (mission 174) first. This brief is a creative first definition: the implementing agent refines it with the owner, one question at a time.

**The rule (the owner, 2026-11-04):** every trait exists for a plausible gameplay reason; a trait says what is exceptional about a kind of object. If no gameplay reason survives the design, propose retiring the trait instead of implementing it.

## The trait

- **Facet:** surface.
- **What it means:** Its top bears the player (implies supportable).
- **Gameplay reason:** Climbing matters: tank roofs reached by ladder are part of the plant (hatches, level gauges, mission 151 and 175); a walkable top is real floor up there, with edges that stop the player as walls do (no falling more than 1 m).

## What to implement

- Its top joined to the walk surfaces at its height, reachable by ladder or stair.
- Edge stops wherever the drop is over 1 m (the existing rule).
- Footsteps on it use its material (see the material trait).
- Behaviour comes from the trait, never from per-kind or per-room code: a kind gains it by `npm run -s audit -- set <kind> traits+=walkable` and nothing else.

**Metadata it implies:** none

## Acceptance

- The behaviour above works for every kind with the trait (one or two worked examples from the trait's page, `bench.html?bench=trait-audit&trait=walkable`), and for none without it.
- Pure parts in `logic/` with tests; the trait's description in `PRIMITIVES` updated to say what it does in the game.
- `doc/agent-tooling.md`'s "Rules for objects" says what the trait does.

## Open questions for the owner

- Does walking on it make a different sound from the floor (sectional tanks boom)?

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased; a diary entry.
