# 177: The `box-like` trait in code

The owner, 2026-11-04. Brief only; not started until the owner says. One of a series, one mission per trait (177–201), defining in code what each trait means for gameplay. Read `doc/plans/172-trait-hierarchy.md`, `src/game/plant/traits.ts` (`PRIMITIVES`) and the trait pages (mission 174) first. This brief is a creative first definition: the implementing agent refines it with the owner, one question at a time.

**The rule (the owner, 2026-11-04):** every trait exists for a plausible gameplay reason; a trait says what is exceptional about a kind of object. If no gameplay reason survives the design, propose retiring the trait instead of implementing it.

## The trait

- **Facet:** form.
- **What it means:** Its shape in the world is its bounding box: a cuboid.
- **Gameplay reason:** Physical consistency: a box-like thing collides as a box, stands steady, and others can rest on its faces; so walking into a cabinet, putting a carton on a desk or stacking boxes behaves the same everywhere.

## What to implement

- A collision volume from the kind's bounding box (or a declared `box`), in its own frame, used by walk collision and by put-down.
- A centre of gravity at the box's centre (owner: 'fits its bounding box and centre of gravity based on a cuboidal shape'), used when it is carried, put down or tips.
- Its six faces known as planes, so `supportable` and `walkable` (top) and `wall-mounted` (back) can use them.
- Behaviour comes from the trait, never from per-kind or per-room code: a kind gains it by `npm run -s audit -- set <kind> traits+=box-like` and nothing else.

**Metadata it implies:** `box` (an explicit box where the bounds fit badly).

## Acceptance

- The behaviour above works for every kind with the trait (one or two worked examples from the trait's page, `bench.html?bench=trait-audit&trait=box-like`), and for none without it.
- Pure parts in `logic/` with tests; the trait's description in `PRIMITIVES` updated to say what it does in the game.
- `doc/agent-tooling.md`'s "Rules for objects" says what the trait does.

## Open questions for the owner

- Is the centre of gravity always the box's centre, or may a kind offset it (a cabinet heavy at the bottom)?

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased; a diary entry.
