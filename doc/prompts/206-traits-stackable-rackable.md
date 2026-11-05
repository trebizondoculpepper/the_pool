# 206: the `stackable` and `rackable` traits: piles and rows

The owner, 2026-11-05: "an object is stackable if it can be placed on top of an object of approximately the same horizontal size, and you can just make a pile of them … the boxes of software, perhaps I could place one on the table and then place another one on top of that. That's stacking. And we'll say rackable is its horizontal equivalent, that when placed adjacent to something that is of similar size, then it can form a neat horizontal arrangement. And the example of that is the shelf." Neither is an important gameplay element; they are needed for the engineers' office, and the owner is "really just doing this more of an investigation of what it is we can achieve through these trait systems". `nicole_buruaah` wrote this brief and takes it, after 159 (one room factory) and the holding traits it builds on (189 `holdable`, 181 `supportable`, 177 `box-like`). Read `CLAUDE.md` (the trait rules), `src/toolkit/controls/CLAUDE.md` (carrying) and `doc/plans/176-completion-rulings.md`.

## Gameplay reason

Tidying up: things put down neatly can be piled or lined up, so a desk or a shelf holds many of them and the room looks kept; put back in a row, a shelf of boxes reads as a library the player can browse.

## What there is now (checked 2026-11-05)

- **Stacking does not exist.** A dropped thing settles on the room floor or on a fixed support (`object-handling.ts`, `groundAt`: `boardSupport` meshes and the room's `supports()`), never on another thing that was dropped.
- **Racking exists only as the engineers' desk's own code:** a software box put back on the shelf is set in a tidy row, spine out, `SHELF_GAP` (6 mm) apart, the row shuffling along to make room (`site-dressing/views/engineers-desk.ts`: `shelfRow`, `spineOut`, `things.shelve`), refused where the row is full. It is per-desk logic, not a trait.
- **The kinds:** `software-box` is `box-like, holdable`; `floppy-disk` is `panel-like, holdable, readable`.

## The traits

Both are primitives in a new **arrangement** facet (no limit: a thing may be both), relations between like things rather than properties of one, the first such in the vocabulary. Each implies `holdable` or `luggable` (only something the player puts down is arranged) and a flat form (`box-like` or `panel-like`).

- **`stackable`**: put down on another stackable thing of about the same footprint, it rests squarely on top of it, aligned with it, and the pile grows; it cannot be put on something much smaller, and a pile has a limit. Metadata with defaults: the footprint tolerance (the two footprints within 25 % on each side), the most in a pile (8), whether it aligns (true).
- **`rackable`**: put down beside another rackable thing of about the same size on the same surface, it lines up with it in a neat row: the same facing, edge to edge at a small gap, square to the row; the row closes up when one is taken out, and refuses when there is no room. Metadata with defaults: the size tolerance (25 %), the gap (6 mm, the shelf's), which face points out (the spine for a box: its narrowest upright face).

Where they apply: on any `supportable` surface (the desk's top, a shelf, another stack), so a shelf is just a supportable surface that rackable things happen to be lined up on; no surface is marked as a rack.

## What to build

1. **The facet and the traits** in `src/game/plant/traits.ts` with their rules (the implied handling and form, checked by `primitiveProblems`) and tests; the kinds through the audit command: `software-box` both, `floppy-disk` both.
2. **Settled things become supports:** a placed or settled `stackable` thing offers its top as a support, so the next one lands on it (the support list in `object-handling.ts` grows and shrinks with the pile).
3. **The arrangement rules, pure** (`src/toolkit/controls/logic/arrangement.ts` or beside the carrying, tested): given what is already on a surface and the thing let go with where it was aimed, where it ends up: squarely on a pile, in a row beside its neighbour (the row shuffled to make room), freely where it was dropped, or refused (a full pile or row). The engineers' desk's `shelfRow` is the reference behaviour and becomes a call to it.
4. **The desk's own shelf code goes:** the shelf is a supportable surface; putting a box back on it is racking, from the trait. What stays the desk's is its carton and the boxes' home slots, if the owner wants "put back where it was" kept.
5. **The crosshair's cue** (mission 116): stacking and racking say what will happen before the player lets go (put on the pile; put in the row; refused).
6. **The investigation:** record in the plan what the trait system could and could not express: these are the first relational traits (a thing's behaviour depends on its neighbours' traits and sizes), their metadata, and what the registry, the audit pages and the resolver needed for them.

## Tests and checks

- Pure: a pile of boxes of the same size grows squarely; a much smaller box on a big one is refused as a stack and dropped freely; a pile at its limit refuses; a row closes up when one is taken out; a box let go beside a like box lines up, spine out; the desk's shelf behaves as before.
- In the browser, in the engineers' office: pile three software boxes on the desk; take one off the shelf and put it back; line up three on the desk's top.
- `npm run typecheck`, `npm run lint`, `npm run format:check`, targeted tests (`--maxWorkers=2`), `npm run build`, one full `npm test` announced on agent-inbox.

## Records

A plan and the investigation's findings in `doc/plans/206-traits-stackable-rackable.md`; the CHANGELOG under Unreleased; `TODO.md` under "Each trait in code"; `src/toolkit/controls/CLAUDE.md` for stacking and racking.
