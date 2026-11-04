# 191: The `pocketable` trait in code

The owner, 2026-11-04. Brief only; not started until the owner says. One of a series, one mission per trait (177–201), defining in code what each trait means for gameplay. Read `doc/plans/172-trait-hierarchy.md`, `src/game/plant/traits.ts` (`PRIMITIVES`) and the trait pages (mission 174) first. This brief is a creative first definition: the implementing agent refines it with the owner, one question at a time.

**The rule (the owner, 2026-11-04):** every trait exists for a plausible gameplay reason; a trait says what is exceptional about a kind of object. If no gameplay reason survives the design, propose retiring the trait instead of implementing it.

## The trait

- **Facet:** handling (proposed).
- **What it means:** Small enough to pick up and put in the player's inventory (the owner, 2026-11-04).
- **Gameplay reason:** The player keeps things for later: keys, a test-kit reagent, a fuse, a floppy disk go into the inventory and come out where they are needed, without filling the hands. The inventory is not yet designed; this trait marks what will go in it.

## What to implement

- A new primitive (code), compatible with holdable (a pocketable thing is also holdable).
- Until the inventory exists: listed by `kinds --with pocketable`, and shown on the item audit, so the inventory's design has its candidates.
- When the inventory exists: pick up to pocket, take out to hand.
- Behaviour comes from the trait, never from per-kind or per-room code: a kind gains it by `npm run -s audit -- set <kind> traits+=pocketable` and nothing else.

**Metadata it implies:** none yet.

## Acceptance

- The behaviour above works for every kind with the trait (one or two worked examples from the trait's page, `bench.html?bench=trait-audit&trait=pocketable`), and for none without it.
- Pure parts in `logic/` with tests; the trait's description in `PRIMITIVES` updated to say what it does in the game.
- `doc/agent-tooling.md`'s "Rules for objects" says what the trait does.

## Open questions for the owner

- Is pocketable a handling trait (instead of holdable) or a use trait alongside it?

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased; a diary entry.
