# 170: Audit pass 2: each kind's traits and mounting

The owner, 2026-11-04. Brief only; not started until the owner says. Uses mission 168's tools; follows 169 (a kind must be registered first). Supersedes the hand-set affordance flags of 158 stage 1 as the way kinds are classified: flags follow from traits.

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

`npm run -s audit -- propose-traits <kind> box-like,operable mount=floor:-y --reason "…"`, validated against the vocabulary and the consistency rules; the owner approves on the review page. Simple, common kinds first.

## Acceptance

- Every registered kind has traits (or `decorative`) and a mounting; the consistency rules pass; the flags 158–165 rely on are derived from traits.
- The engineers' office's kinds are the worked examples (desk: box-like, operable; storage cupboard: box-like, operable; chair: chair-like, luggable; software box: box-like, portable; noticeboard: panel-like).

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased; a diary entry.
