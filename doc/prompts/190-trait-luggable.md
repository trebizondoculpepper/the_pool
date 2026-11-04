# 190: The `luggable` trait in code

The owner, 2026-11-04. Brief only; not started until the owner says. One of a series, one mission per trait (177–201), defining in code what each trait means for gameplay. Read `doc/plans/172-trait-hierarchy.md`, `src/game/plant/traits.ts` (`PRIMITIVES`) and the trait pages (mission 174) first. This brief is a creative first definition: the implementing agent refines it with the owner, one question at a time.

**The rule (the owner, 2026-11-04):** every trait exists for a plausible gameplay reason; a trait says what is exceptional about a kind of object. If no gameplay reason survives the design, propose retiring the trait instead of implementing it.

## The trait

- **Facet:** handling.
- **What it means:** A very heavy or bulky thing, too big or too heavy to pick up, that can still be moved: pushed, staying on the floor, tethered to the y = 0 plane (the owner's example: a crate you can push but cannot carry).
- **Gameplay reason:** Moving heavy stock is work: crates, drums and heavy chairs are pushed across the floor, slower than walking, and can block a doorway, so where things are put matters.

**Movable things (the owner, 2026-11-04):** all three handling traits are kinds of movable thing. Some movable things can be carried (**holdable**), and some carryable things can also go into the inventory (**pocketable**); others are too big or heavy to lift and are pushed along the floor (**luggable**). So: movable → luggable, or holdable → pocketable. Everything pocketable is also holdable (`pocketable` implies `holdable`, as `walkable` implies `supportable`); luggable and holdable exclude each other.

## What to implement

- Push along the floor: the object stays on y = 0, never lifted; the player walks slower while pushing.
- Blocked by walls and other solids; never up ladders or stairs.
- Left where it stops, and remembered there (world state).
- Never holdable (they exclude each other).
- Behaviour comes from the trait, never from per-kind or per-room code: a kind gains it by `npm run -s audit -- set <kind> traits+=luggable` and nothing else.

**Metadata it implies:** `mass` (kg, optional).

## Acceptance

- The behaviour above works for every kind with the trait (one or two worked examples from the trait's page, `bench.html?bench=trait-audit&trait=luggable`), and for none without it.
- Pure parts in `logic/` with tests; the trait's description in `PRIMITIVES` updated to say what it does in the game.
- `doc/agent-tooling.md`'s "Rules for objects" says what the trait does.

## Open questions for the owner

- Pull as well as push, or push only?
- Can a luggable thing be pushed through a door into the next room (with holdable's carrying between rooms)?

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased; a diary entry.
