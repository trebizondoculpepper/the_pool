# 179: The `panel-like` trait in code

The owner, 2026-11-04. Brief only; not started until the owner says. One of a series, one mission per trait (177–201), defining in code what each trait means for gameplay. Read `doc/plans/172-trait-hierarchy.md`, `src/game/plant/traits.ts` (`PRIMITIVES`) and the trait pages (mission 174) first. This brief is a creative first definition: the implementing agent refines it with the owner, one question at a time.

**The rule (the owner, 2026-11-04):** every trait exists for a plausible gameplay reason; a trait says what is exceptional about a kind of object. If no gameplay reason survives the design, propose retiring the trait instead of implementing it.

## The trait

- **Facet:** form.
- **What it means:** A thin slab: a sign, a noticeboard, a panel's face, a floppy disk.
- **Gameplay reason:** Thin things are read and slipped, not walked into: no step-up, no standing on them, and they can lie flat on a surface or hang flush on a wall.

## What to implement

- A thin collision slab (or none below a thickness), so the walker never catches on a sign.
- Placement flush against a surface (wall, desk top) by its broad face.
- With `readable`, its broad face is what the reader looks at.
- Behaviour comes from the trait, never from per-kind or per-room code: a kind gains it by `npm run -s audit -- set <kind> traits+=panel-like` and nothing else.

**Metadata it implies:** `thickness` (from bounds).

## Acceptance

- The behaviour above works for every kind with the trait (one or two worked examples from the trait's page, `bench.html?bench=trait-audit&trait=panel-like`), and for none without it.
- Pure parts in `logic/` with tests; the trait's description in `PRIMITIVES` updated to say what it does in the game.
- `doc/agent-tooling.md`'s "Rules for objects" says what the trait does.

## Open questions for the owner

- Below what thickness is it not solid at all?

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased; a diary entry.
