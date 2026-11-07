# Plan 205: the `bin-like` trait

Mission brief: [205](../prompts/205-trait-bin-like.md). Done 2026-11-05 by ahnaa_dmitrieva, in two steps (`fe6a20fd`, then this one).

## Design

- **The trait** is `bin-like`, a primitive in the role facet (`src/game/plant/traits.ts`). Kinds: `skip` and `dustbin`, both `bin-like, box-like, fixed, floor-standing`.
- **A bin's inside is declared by its builder:** `markBin(group, { shape, footprint })` in `site-dressing/parts/bin-tossing.ts`. `createSkip` and `createWasteBin` mark their own kind and inside, so any room that places one has a bin.
- **One shared bin tossing per room:** `roomBins` in `gallery/views/room-object-traits.ts`, installed through `RoomObjectTraits.bins`. It finds every placed object of a bin-like kind with a bin mark (looking again every half second, so a bin added later is found), reads where it is in the world (its foot's height and a scaled hall's frame included), and gives it to the room controller's `divert` and `nearbyTargetFeedback`. `walker.bins` exposes `filled()` and `toss()`.
- **A placement's own rules are its metadata, not a room's tossing:** `binRules(group, { takes, keep, onLanded })`. The skimmer's finds-only filter, Hall 5's count of finds landed and the repair room's restock are each set on the placed bin; `emptyBin(group)` empties one on a reset. By default what lands can be picked out again (the owner, 2026-11-05); the three game rooms keep what lands, as before.

## Rooms moved onto the trait

- dev5 (first step).
- The repair room's scrap skip.
- The skimmer reveal's skip. It is now drawn where it is thrown into, by the east wall; before, it was drawn at the room's middle while the toss aimed at the east wall.
- Hall 5's waste bin.

No room calls `createBinTossing` any more; `settling-room.ts` and `exhibit-carrying.ts` only refer to it in comments or types.

## Tests

`room-traits.test.ts`: a skip and a dustbin are bin-like by kind; a placed bin's rules come from its placement (a stray is refused, a find flies in, lands raised with the bin's foot, is counted, kept locked and reported, and `emptyBin` empties it).

## Follow-ups

- The item audit showing each bin's derived opening and reach (brief, step 5).
- Wheelie, litter and grit bins as kinds only when one is placed and takes things.
- The bin toss's arc is mission 209.
