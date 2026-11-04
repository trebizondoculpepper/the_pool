# 187: The `terminal` trait in code

The owner, 2026-11-04. Brief only; not started until the owner says. One of a series, one mission per trait (177–201), defining in code what each trait means for gameplay. Read `doc/plans/172-trait-hierarchy.md`, `src/game/plant/traits.ts` (`PRIMITIVES`) and the trait pages (mission 174) first. This brief is a creative first definition: the implementing agent refines it with the owner, one question at a time.

**The rule (the owner, 2026-11-04):** every trait exists for a plausible gameplay reason; a trait says what is exceptional about a kind of object. If no gameplay reason survives the design, propose retiring the trait instead of implementing it.

## The trait

- **Facet:** connection.
- **What it means:** Ends a run: an outlet, a sink, a source, a drain.
- **Gameplay reason:** Runs must end somewhere the player can find: a terminal is where water leaves or enters, where a cable starts, the thing a trace leads to.

## What to implement

- The end of a run in the model, with one port.
- The inspection overlay's trace stops here and names it.
- Behaviour comes from the trait, never from per-kind or per-room code: a kind gains it by `npm run -s audit -- set <kind> traits+=terminal` and nothing else.

**Metadata it implies:** none

## Acceptance

- The behaviour above works for every kind with the trait (one or two worked examples from the trait's page, `bench.html?bench=trait-audit&trait=terminal`), and for none without it.
- Pure parts in `logic/` with tests; the trait's description in `PRIMITIVES` updated to say what it does in the game.
- `doc/agent-tooling.md`'s "Rules for objects" says what the trait does.

## Open questions for the owner

- Is this trait worth keeping, or is it implied by the model's ports? (Gameplay reason weak: propose retiring if none emerges.)

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased; a diary entry.
