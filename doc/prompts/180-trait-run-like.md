# 180: The `run-like` trait in code

The owner, 2026-11-04. Brief only; not started until the owner says. One of a series, one mission per trait (177–201), defining in code what each trait means for gameplay. Read `doc/plans/172-trait-hierarchy.md`, `src/game/plant/traits.ts` (`PRIMITIVES`) and the trait pages (mission 174) first. This brief is a creative first definition: the implementing agent refines it with the owner, one question at a time.

**The rule (the owner, 2026-11-04):** every trait exists for a plausible gameplay reason; a trait says what is exceptional about a kind of object. If no gameplay reason survives the design, propose retiring the trait instead of implementing it.

## The trait

- **Facet:** form.
- **What it means:** A pipe, cable or duct run: long, thin, following a route.
- **Gameplay reason:** Runs fill rooms without blocking them: the walker passes through or under, and a run is followed rather than walked round; this is what keeps plant rooms walkable.

## What to implement

- No walk collision (walk-through), but the cursor can still pick it for inspection.
- Its route as data (the plumber's), so a run can be traced end to end in the inspection overlay.
- Optional: footstep and touch sounds where the walker brushes it.
- Behaviour comes from the trait, never from per-kind or per-room code: a kind gains it by `npm run -s audit -- set <kind> traits+=run-like` and nothing else.

**Metadata it implies:** none

## Acceptance

- The behaviour above works for every kind with the trait (one or two worked examples from the trait's page, `bench.html?bench=trait-audit&trait=run-like`), and for none without it.
- Pure parts in `logic/` with tests; the trait's description in `PRIMITIVES` updated to say what it does in the game.
- `doc/agent-tooling.md`'s "Rules for objects" says what the trait does.

## Open questions for the owner

- Should large ducts (that a person would duck under) block at head height?

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased; a diary entry.
