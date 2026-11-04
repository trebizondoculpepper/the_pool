# 194: The `readable` trait in code

The owner, 2026-11-04. Brief only; not started until the owner says. One of a series, one mission per trait (177–201), defining in code what each trait means for gameplay. Read `doc/plans/172-trait-hierarchy.md`, `src/game/plant/traits.ts` (`PRIMITIVES`) and the trait pages (mission 174) first. This brief is a creative first definition: the implementing agent refines it with the owner, one question at a time.

**The rule (the owner, 2026-11-04):** every trait exists for a plausible gameplay reason; a trait says what is exceptional about a kind of object. If no gameplay reason survives the design, propose retiring the trait instead of implementing it.

## The trait

- **Facet:** use.
- **What it means:** Hover context: a sign, gauge, label or display to read.
- **Gameplay reason:** The game is read as much as played: hovering a readable thing names it and says what it shows (a gauge's reading, a sign's text, a disk's label), with no peeking beyond what it shows.

## What to implement

- The inspection line (mission 160) for every readable kind.
- Its text or reading from the kind's view (a sign's text, a display's value).
- Behaviour comes from the trait, never from per-kind or per-room code: a kind gains it by `npm run -s audit -- set <kind> traits+=readable` and nothing else.

**Metadata it implies:** none

## Acceptance

- The behaviour above works for every kind with the trait (one or two worked examples from the trait's page, `bench.html?bench=trait-audit&trait=readable`), and for none without it.
- Pure parts in `logic/` with tests; the trait's description in `PRIMITIVES` updated to say what it does in the game.
- `doc/agent-tooling.md`'s "Rules for objects" says what the trait does.

## Open questions for the owner

- Is every registered kind readable by default (hover names it), making this trait redundant? If so, propose retiring it.

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased; a diary entry.
