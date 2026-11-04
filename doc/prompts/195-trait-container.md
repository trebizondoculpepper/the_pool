# 195: The `container` trait in code

The owner, 2026-11-04. Brief only; not started until the owner says. One of a series, one mission per trait (177–201), defining in code what each trait means for gameplay. Read `doc/plans/172-trait-hierarchy.md`, `src/game/plant/traits.ts` (`PRIMITIVES`) and the trait pages (mission 174) first. This brief is a creative first definition: the implementing agent refines it with the owner, one question at a time.

**The rule (the owner, 2026-11-04):** every trait exists for a plausible gameplay reason; a trait says what is exceptional about a kind of object. If no gameplay reason survives the design, propose retiring the trait instead of implementing it.

## The trait

- **Facet:** role.
- **What it means:** Holds a stock: water, chemical, parts.
- **Gameplay reason:** Stocks run out and are refilled: a container's contents are something the player watches and manages (tank levels, chemical day tanks, a parts cupboard).

## What to implement

- Its stock read from the model (a tank's level) and shown on hover and the item audit.
- Later: storage logic (put things in a cupboard, draw chemical from a drum).
- Behaviour comes from the trait, never from per-kind or per-room code: a kind gains it by `npm run -s audit -- set <kind> traits+=container` and nothing else.

**Metadata it implies:** `stock` (what it holds), `capacity` (optional).

## Acceptance

- The behaviour above works for every kind with the trait (one or two worked examples from the trait's page, `bench.html?bench=trait-audit&trait=container`), and for none without it.
- Pure parts in `logic/` with tests; the trait's description in `PRIMITIVES` updated to say what it does in the game.
- `doc/agent-tooling.md`'s "Rules for objects" says what the trait does.

## Open questions for the owner

- Is a parts cupboard a container in the same sense as a tank?

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased; a diary entry.
