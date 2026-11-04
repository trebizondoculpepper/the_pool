# 178: The `cylindrical` trait in code

The owner, 2026-11-04. Brief only; not started until the owner says. One of a series, one mission per trait (177–201), defining in code what each trait means for gameplay. Read `doc/plans/172-trait-hierarchy.md`, `src/game/plant/traits.ts` (`PRIMITIVES`) and the trait pages (mission 174) first. This brief is a creative first definition: the implementing agent refines it with the owner, one question at a time.

**The rule (the owner, 2026-11-04):** every trait exists for a plausible gameplay reason; a trait says what is exceptional about a kind of object. If no gameplay reason survives the design, propose retiring the trait instead of implementing it.

## The trait

- **Facet:** form.
- **What it means:** A cylinder in the game world (filters, vessels, drums): not a perfect cylinder, but treated as one.
- **Gameplay reason:** Round things behave round: the walker slides around a vessel rather than catching on corners, a drum can be rolled (with luggable), and pipes meet it on its curved face.

## What to implement

- A capsule or cylinder collision volume along its `axis`, radius from its bounds.
- Pipe ports on the curved face (radial nozzles, as the plumber already draws them).
- With `luggable`, rolling along the floor when lying down (`axis` x or z).
- Behaviour comes from the trait, never from per-kind or per-room code: a kind gains it by `npm run -s audit -- set <kind> traits+=cylindrical` and nothing else.

**Metadata it implies:** `axis` (y upright; x or z lying down).

## Acceptance

- The behaviour above works for every kind with the trait (one or two worked examples from the trait's page, `bench.html?bench=trait-audit&trait=cylindrical`), and for none without it.
- Pure parts in `logic/` with tests; the trait's description in `PRIMITIVES` updated to say what it does in the game.
- `doc/agent-tooling.md`'s "Rules for objects" says what the trait does.

## Open questions for the owner

- Does a lying drum roll by itself on a slope (there are no slopes yet)?

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased; a diary entry.
