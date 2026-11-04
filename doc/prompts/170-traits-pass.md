# 170: Audit pass 2, phase 1: survey the kinds and propose the trait vocabulary

The owner, 2026-11-04. Brief only; not started until the owner says. Uses missions 168 and 172's tools (**the trait vocabulary, composites and metadata are now 172's: read `doc/plans/172-trait-hierarchy.md` and `npm run -s audit -- help`; where this brief's table, names (`chair-like`, `portable`) or `mount` differ, 172 wins**); follows 169 (a kind must be registered first).

**Split (the owner, 2026-11-04):** pass 2 is two phases. **Phase 1 (this mission):** go through the objects in the collection and propose the list of traits, mostly composites, that will later be applied; the owner approves which. Nothing is applied to kinds in this phase. **Phase 2 is mission 176:** apply the approved traits to every kind, then switch on enforcement that every object has at least one trait. Where the sections below describe applying traits to kinds, that is 176's.

## Phase 1: what to do

1. Survey every registered kind from the command line (`npm run -s audit -- kinds`, `show <kind>` for its source evidence, placements and derived services; the item audit and its CAD views where a look helps), without changing any kind.
2. Group kinds that behave alike and propose, for each group, a composite trait: its name, its description, the primitives it extends, any metadata defaults, and the kinds it would go on (for example `sectional-tank` = box-like, floor-standing, walkable, container, fixed: balance, break and backwash tanks). Propose primitives alone where no bundle is worth naming.
3. Write the proposal as one reviewable list in `doc/plans/170-trait-vocabulary.md`: composites first, each with its members and why; then the kinds no proposal covers. No `trait define` and no `set … traits=` yet.
4. The owner approves, edits or rejects each proposed trait; the approved list is recorded in the same file and 176 starts from it.

## Acceptance (phase 1)

- Every registered kind appears in the proposal, under a proposed trait or as uncovered.
- The owner has ruled on each proposed trait; the approved list is in `doc/plans/170-trait-vocabulary.md`.
- No kind or trait file changed. Supersedes the hand-set affordance flags of 158 stage 1 as the way kinds are classified: flags follow from traits.

## Kind by kind, not room by room

Once a thing is registered, its classification is judged on the kind in the abstract: its builder, its source evidence, its magic room and CAD views (130, 133), and where it is used. No room needs opening.

## Traits (the owner, 2026-11-04)

A kind carries any number of traits; the flags follow mechanically:

| Trait      | Means                                                  | Flags                                                                |
| ---------- | ------------------------------------------------------ | -------------------------------------------------------------------- |
| chair-like | something to sit on                                    | a seat, with height and look direction                               |
| box-like   | a rectangular solid                                    | solid, bounding box, its top holds objects, walkable where reachable |
| portable   | can be picked up                                       | portable                                                             |
| operable   | has working controls                                   | usable                                                               |
| panel-like | flat on a wall (signs, noticeboards, wall instruments) | inspect-only, not walkable                                           |
| run-like   | pipes, cables, ducts                                   | not solid, walk-through                                              |
| decorative | intentionally inert: seen, does nothing                | no context, no clicks                                                |

- **No traits = unlabelled**, a finding; **decorative** is the deliberate label, so intent and omission are distinguishable.
- **Consistency rules**, pure and tested: decorative never with operable, chair-like, portable or luggable; portable and luggable never together; decorative with box-like is flagged as odd (decorative implies walk-through); more rules as they are found.

## Mounting (the owner, 2026-11-04)

How the kind relates to the physical world: **floor-standing**, **wall-mounted** or **ceiling-mounted** (more as needed). A mounted kind names which plane of the object meets its support: for a floor-standing machine, which face is its floor (its base); for a wall-mounted one, which face is against the wall; for a ceiling-mounted one, which face is up. So it can later be placed by code without hand-tuning. The magic room and CAD views use it too.

## How

Define a few composites (`npm run -s audit -- trait define …`), then give each kind one or two (`npm run -s audit -- set <kind> traits=…`), with metadata only where it differs from the defaults; `check` and `unclassified` show what is left. No proposals: git is the review. Simple, common kinds first.

## Acceptance

- Every registered kind has traits (or `decorative`) and a mounting; the consistency rules pass; the flags 158–165 rely on are derived from traits.
- The engineers' office's kinds are the worked examples (desk: box-like, operable; storage cupboard: box-like, operable; chair: chair-like, luggable; software box: box-like, portable; noticeboard: panel-like).

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased; a diary entry.
