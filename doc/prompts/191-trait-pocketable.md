# 191: The `pocketable` trait in code

The owner, 2026-11-04. Brief only; not started until the owner says. One of a series, one mission per trait (177–201), defining in code what each trait means for gameplay. Read `doc/plans/172-trait-hierarchy.md`, `src/game/plant/traits.ts` (`PRIMITIVES`) and the trait pages (mission 174) first. This brief is a creative first definition: the implementing agent refines it with the owner, one question at a time.

**The rule (the owner, 2026-11-04):** every trait exists for a plausible gameplay reason; a trait says what is exceptional about a kind of object. If no gameplay reason survives the design, propose retiring the trait instead of implementing it.

## The trait

- **Facet:** handling (proposed).
- **What it means:** Something that can go into the player's inventory (the owner, 2026-11-04); everything pocketable is also holdable.
- **Gameplay reason:** The player keeps things for later without filling their hands: keys, a reagent, a fuse, a floppy disk go into the inventory and come out where needed. The inventory is not designed yet; this trait marks what will go in it.

**Movable things (the owner, 2026-11-04):** all three handling traits are kinds of movable thing. Some movable things can be carried (**holdable**), and some carryable things can also go into the inventory (**pocketable**); others are too big or heavy to lift and are pushed along the floor (**luggable**). So: movable → luggable, or holdable → pocketable. Everything pocketable is also holdable (`pocketable` implies `holdable`, as `walkable` implies `supportable`); luggable and holdable exclude each other.

## What to implement

- A new primitive that **implies holdable** (in `PRIMITIVES`, `implies: ['holdable']`), so pocketable things are picked up, examined and carried like any holdable thing.
- The handling facet's rule adjusted so holdable and pocketable together count as one handling (pocketable refines holdable), while luggable still excludes both.
- Until the inventory exists: listed by `kinds --with pocketable` and on the trait page, as the inventory's candidates.
- When the inventory exists: pocket a held thing, take it out into the hand.
- Behaviour comes from the trait, never from per-kind or per-room code: a kind gains it by `npm run -s audit -- set <kind> traits+=pocketable` and nothing else.

**Metadata it implies:** none yet.

## Acceptance

- The behaviour above works for every kind with the trait (one or two worked examples from the trait's page, `bench.html?bench=trait-audit&trait=pocketable`), and for none without it.
- Pure parts in `logic/` with tests; the trait's description in `PRIMITIVES` updated to say what it does in the game.
- `doc/agent-tooling.md`'s "Rules for objects" says what the trait does.

## Open questions for the owner

- How big may a pocketable thing be (a fuse yes, a 5 L can no)?

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased; a diary entry.
