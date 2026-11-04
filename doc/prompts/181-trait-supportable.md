# 181: The `supportable` trait in code

The owner, 2026-11-04. Brief only; not started until the owner says. One of a series, one mission per trait (177–201), defining in code what each trait means for gameplay. Read `doc/plans/172-trait-hierarchy.md`, `src/game/plant/traits.ts` (`PRIMITIVES`) and the trait pages (mission 174) first. This brief is a creative first definition: the implementing agent refines it with the owner, one question at a time.

**The rule (the owner, 2026-11-04):** every trait exists for a plausible gameplay reason; a trait says what is exceptional about a kind of object. If no gameplay reason survives the design, propose retiring the trait instead of implementing it.

## The trait

- **Facet:** surface.
- **What it means:** Objects can be put on its top.
- **Gameplay reason:** The player's hands are free: a held object can be set down on any flat top it fits, the same rule everywhere (desks, tank roofs, cabinets).

## What to implement

- The kind's top face (from its form) offered to put-down as a surface.
- Fit by footprint: refuse a put-down that would overhang its edges by more than half.
- Objects on it move with it if it moves (a luggable trolley).
- Behaviour comes from the trait, never from per-kind or per-room code: a kind gains it by `npm run -s audit -- set <kind> traits+=supportable` and nothing else.

**Metadata it implies:** none

## Acceptance

- The behaviour above works for every kind with the trait (one or two worked examples from the trait's page, `bench.html?bench=trait-audit&trait=supportable`), and for none without it.
- Pure parts in `logic/` with tests; the trait's description in `PRIMITIVES` updated to say what it does in the game.
- `doc/agent-tooling.md`'s "Rules for objects" says what the trait does.

## Open questions for the owner

- Does a supportable top have a load limit (a 25 kg drum on a sign shelf)?

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased; a diary entry.
