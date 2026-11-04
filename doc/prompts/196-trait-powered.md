# 196: The `powered` trait in code

The owner, 2026-11-04. Brief only; not started until the owner says. One of a series, one mission per trait (177–201), defining in code what each trait means for gameplay. Read `doc/plans/172-trait-hierarchy.md`, `src/game/plant/traits.ts` (`PRIMITIVES`) and the trait pages (mission 174) first. This brief is a creative first definition: the implementing agent refines it with the owner, one question at a time.

**The rule (the owner, 2026-11-04):** every trait exists for a plausible gameplay reason; a trait says what is exceptional about a kind of object. If no gameplay reason survives the design, propose retiring the trait instead of implementing it.

## The trait

- **Facet:** service.
- **What it means:** Has an electrical input (derived from its ports).
- **Gameplay reason:** Power cuts are part of the game: when its supply is lost, a powered thing changes mode (stops, goes dark, alarms), so isolating a feeder has visible consequences.

## What to implement

- Derived from model ports (done in 172); the trait page lists everything a feeder fault would affect.
- Behaviour on loss of power belongs to the simulation, not the trait; the trait is the index.
- Behaviour comes from the trait, never from per-kind or per-room code: a kind gains it by `npm run -s audit -- set <kind> traits+=powered` and nothing else.

**Metadata it implies:** `supply` (derived).

## Acceptance

- The behaviour above works for every kind with the trait (one or two worked examples from the trait's page, `bench.html?bench=trait-audit&trait=powered`), and for none without it.
- Pure parts in `logic/` with tests; the trait's description in `PRIMITIVES` updated to say what it does in the game.
- `doc/agent-tooling.md`'s "Rules for objects" says what the trait does.

## Open questions for the owner

- None.

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased; a diary entry.
