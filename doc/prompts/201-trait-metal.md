# 201: The `metal` trait in code

The owner, 2026-11-04. Brief only; not started until the owner says. One of a series, one mission per trait (177–201), defining in code what each trait means for gameplay. Read `doc/plans/172-trait-hierarchy.md`, `src/game/plant/traits.ts` (`PRIMITIVES`) and the trait pages (mission 174) first. This brief is a creative first definition: the implementing agent refines it with the owner, one question at a time.

**The rule (the owner, 2026-11-04):** every trait exists for a plausible gameplay reason; a trait says what is exceptional about a kind of object. If no gameplay reason survives the design, propose retiring the trait instead of implementing it.

## The trait

- **Facet:** material (proposed).
- **What it means:** Made of metal (the owner's example: a gantry).
- **Gameplay reason:** Materials are heard and felt: footsteps on a metal gantry ring, on concrete thud; knocking a metal tank sounds hollow or full. A material facet gives every surface its sound without per-object code.

## What to implement

- A new facet, material (metal, concrete, plastic, wood, glass…), one per kind, starting with metal.
- Footstep and impact sounds chosen by the material of the surface walked on or struck.
- Defaults: kinds with no material use the room floor's.
- Behaviour comes from the trait, never from per-kind or per-room code: a kind gains it by `npm run -s audit -- set <kind> traits+=metal` and nothing else.

**Metadata it implies:** none

## Acceptance

- The behaviour above works for every kind with the trait (one or two worked examples from the trait's page, `bench.html?bench=trait-audit&trait=metal`), and for none without it.
- Pure parts in `logic/` with tests; the trait's description in `PRIMITIVES` updated to say what it does in the game.
- `doc/agent-tooling.md`'s "Rules for objects" says what the trait does.

## Open questions for the owner

- Which materials first, and does a kind ever have more than one (a steel tank with a GRP roof)?

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased; a diary entry.
