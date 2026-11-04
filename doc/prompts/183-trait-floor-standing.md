# 183: The `floor-standing` trait in code

The owner, 2026-11-04. Brief only; not started until the owner says. One of a series, one mission per trait (177–201), defining in code what each trait means for gameplay. Read `doc/plans/172-trait-hierarchy.md`, `src/game/plant/traits.ts` (`PRIMITIVES`) and the trait pages (mission 174) first. This brief is a creative first definition: the implementing agent refines it with the owner, one question at a time.

**The rule (the owner, 2026-11-04):** every trait exists for a plausible gameplay reason; a trait says what is exceptional about a kind of object. If no gameplay reason survives the design, propose retiring the trait instead of implementing it.

## The trait

- **Facet:** support.
- **What it means:** Stands on the floor; its base is its local y = 0 plane by default.
- **Gameplay reason:** Placement without hand-tuning: anything floor-standing is put on the floor of its room by code, the same way in rooms, magic rooms and CAD views, so nothing floats or sinks.

## What to implement

- Placement that puts its `origin` (base by default) on the room floor at y = 0.
- An origin audit that measures each builder's bounds and lists kinds whose base is not at 0.
- The base face for shadows and contact.
- Behaviour comes from the trait, never from per-kind or per-room code: a kind gains it by `npm run -s audit -- set <kind> traits+=floor-standing` and nothing else.

**Metadata it implies:** `origin`, `base`.

## Acceptance

- The behaviour above works for every kind with the trait (one or two worked examples from the trait's page, `bench.html?bench=trait-audit&trait=floor-standing`), and for none without it.
- Pure parts in `logic/` with tests; the trait's description in `PRIMITIVES` updated to say what it does in the game.
- `doc/agent-tooling.md`'s "Rules for objects" says what the trait does.

## Open questions for the owner

- Do stands and plinths belong to the kind or the placement?

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased; a diary entry.
