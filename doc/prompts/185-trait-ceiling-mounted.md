# 185: The `ceiling-mounted` trait in code

The owner, 2026-11-04. Brief only; not started until the owner says. One of a series, one mission per trait (177–201), defining in code what each trait means for gameplay. Read `doc/plans/172-trait-hierarchy.md`, `src/game/plant/traits.ts` (`PRIMITIVES`) and the trait pages (mission 174) first. This brief is a creative first definition: the implementing agent refines it with the owner, one question at a time.

**The rule (the owner, 2026-11-04):** every trait exists for a plausible gameplay reason; a trait says what is exceptional about a kind of object. If no gameplay reason survives the design, propose retiring the trait instead of implementing it.

## The trait

- **Facet:** support.
- **What it means:** Hangs from the ceiling, its top against it.
- **Gameplay reason:** Overhead plant (lights, extract fans, cable trays) is placed by code against the ceiling at any room height, and is out of the walker's way.

## What to implement

- Placement against the ceiling by its top face (`origin` top by default).
- No walk collision unless it hangs below head height.
- Inspection from below (look up).
- Behaviour comes from the trait, never from per-kind or per-room code: a kind gains it by `npm run -s audit -- set <kind> traits+=ceiling-mounted` and nothing else.

**Metadata it implies:** `origin`.

## Acceptance

- The behaviour above works for every kind with the trait (one or two worked examples from the trait's page, `bench.html?bench=trait-audit&trait=ceiling-mounted`), and for none without it.
- Pure parts in `logic/` with tests; the trait's description in `PRIMITIVES` updated to say what it does in the game.
- `doc/agent-tooling.md`'s "Rules for objects" says what the trait does.

## Open questions for the owner

- Below what height does a hanging thing start to block the walker?

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased; a diary entry.
