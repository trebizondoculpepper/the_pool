# Mission 209: the bin toss's trajectory

The owner, 2026-11-05, while mission 205 made `bin-like` a trait: the arc a thrown thing follows into a bin wants its own mission ("I think there's a lot to discuss with bin tossing"). The owner has settled the design below; implementation is pending. See [the implementation plan](../plans/209-bin-toss-trajectory.md).

## Today

`binArc` (`src/toolkit/components/site-dressing/logic/bin-toss.ts`) goes straight across the floor plan from where the thing is let go to its rest on the pile, with a parabola in height that rises a fixed 0.25 m above the higher end. Nothing makes it come down through the bin's opening: from far off, from low down, or landing near an edge, it can pass through the bin's side or rim.

## The owner's ideas so far (2026-11-05)

- **A target plane.** A bin has a target area: a bounded plane, usually within the object (a skip's opening at its rim). The parabola is chosen so that the thing's path crosses that plane, inside its bounds.
- **As near the normal as feasible (earlier idea).** A near-vertical entry is visually desirable, but the later ruling makes entry through the target zone the requirement; room height and distance can prevent a near-vertical path.
- **Good enough (earlier idea).** Within about 10° of the normal was suggested, but is no longer a required threshold.

## Settled with the owner (2026-11-05)

- **Trigger and reach.** With an item held and a `bin-like` object targeted, either USE or LET GO starts the guaranteed bin toss when the bin is in range for ordinary use (the owner, 2026-11-05). Both inputs use that bin's interaction range, with no separate toss distance. For now every holdable item is eligible, regardless of size or kind. `Luggable` objects cannot be picked up and therefore cannot be tossed. This is a third projection category, separate from deliberate placement and the general throw in [211](211-let-go-throw-use-while-holding.md).
- **Trait scope.** Every object with the `bin-like` trait has this behaviour. All current bin-like objects have an open top, so no additional trait is required. If other bin shapes are added later, refine the trait model then.
- **Intended objects.** The skip, the Rubbermaid-style cylindrical dustbin, and the engineer's office cardboard carton all need `bin-like`. The carton is also `box-like` and fixed on the office floor; this is a combination of traits, not a separate bin-toss rule. The dustbin is now registered and bin-like (mission 205); the carton still needs registration and binding under the engineer's office TODO item.
- **Flight.** The toss evokes an underarm throw: the object travels upward toward the bin on a parabolic arc, chosen to pass down through the bin's bounded opening plane. It is aimed at the bin rather than merely launched in the player's facing direction.
- **Plausible timing.** The game calculates a plausible underarm launch speed needed to enter the target zone from within the bin's use range; gravity determines the parabolic flight and its duration. The player does not choose the speed or arc height and cannot charge the toss. Higher arcs may take longer (the owner, 2026-11-05).
- **Guaranteed success.** A bin toss always carries the item's centre through the circular target zone. Once below that plane, the object interacts with the bin's internal bounding box, may ricochet off it, and settles inside. Each internal ricochet loses roughly 20–30% of momentum, tuned for a convincing look. A near-vertical entry is desirable but not required; crossing the target zone takes priority. For oversized holdables, visual overlap with the bin wall is accepted until fit rules are designed (the owner, 2026-11-05).
- **Target zone.** Every bin supplies a circular target zone with a local Y-height and radius, including the cylindrical dustbin, rectangular skip and cardboard carton (the owner, 2026-11-05). The circle can lie safely inside a wider rectangular opening; the toss need not model the opening's exact outline. Its horizontal centre can come from the bin's declared inside.
- **No full-bin rule.** Every eligible toss succeeds regardless of how many things are already inside. Items settle on top of the existing pile; there is no capacity, full state or refusal. The simulation does not need bin fullness for now (the owner, 2026-11-05).
- **Overhead clearance.** The first version ignores ceilings and overhead ducts when choosing or drawing the bin-toss arc (the owner, 2026-11-05).
- **Orientation and landing.** The item turns to lie flat during the arc, as it does today, then settles on the upper surfaces of items already in the bin using the existing support/raycast approach (the owner, 2026-11-05).
- **Stationary bins only.** A bin must be stationary to receive a toss. The engineer's office carton is not movable, and this single-player game has no case where a carried bin receives a toss. Moving a bin with contents is outside this design (the owner, 2026-11-05).
- **Retrievable contents.** Items that have landed in any bin remain pick-upable and carryable. A future bin setting may despawn contents, but no bin does so in this version (the owner, 2026-11-05).

## Implementation and later work

- Add the circular target zone's local Y-height and radius to each bin's configuration; its horizontal centre comes from the declared inside.
- Use the bin's ordinary target and use range for both USE and LET GO. Remove the old near-bin magnet, which would turn a missed aim into a guaranteed toss.
- Every holdable item must be accepted in this version. Fit rules, edge margins for large objects and items that may not be binned are later work.
- Ignore ceilings and ducts in this version. A first draft of the pure maths was written and withdrawn on 2026-11-05 at the owner's word; it is in this session's history if wanted.

## Earlier code analysis and answered questions (ahnaa_dmitrieva, 2026-11-05)

Checked against the code after mission 205 finished (`ca6a0ff9`). Questions are numbered so they can be answered by number; the first ones block the most.

### Out of date in this brief

- "Only `skip` is marked `bin-like`": the `dustbin` kind is now registered and bin-like too (205), and the skip in the repair room, the skimmer reveal and Hall 5's waste bin all come from the trait. The carton is still not bin-like (its own put-in code, `createDeskCarton`).
- A bin already declares an inside: `markBin(group, { shape, footprint })`, where `shape` gives the inside's half-width and half-depth at the bottom, its floor and its rim height. The opening plane can be derived from that (at `rim`, the size of the footprint less the walls) with no new declaration.

### Inconsistencies identified before the rulings above

- **What starts a toss.** The settled trigger is _using_ the bin while holding something. What 205 built is the opposite: _letting go_ within 2 m of the bin's opening, facing within 40°, is diverted into the bin (the "magnet"). And 211 says use while holding works whatever is aimed at, and that let go aimed at anything else throws.
- **Reach.** "Normal use range" is not one number today: the general use reach is 3.2 m (`destination.reach ?? 3.2`), rooms use 3 m or 4 m for their own uses, and the bin toss has 1.5 m (`BIN_REACH`), 2 m (`BIN_MAGNET_REACH`) and 40° (`BIN_FACING`).
- **The arc's timing** is by horizontal distance (`arcSeconds`), not gravity, so a higher lob would not take longer.

### Defects found

- **Things bigger than the bin.** `binRest` lays every thing flat along the bin. The dustbin's inside is about 0.32 m across at the bottom, so anything longer (a 0.5 m board, a long spare part) is laid through its walls. Nothing checks whether a thing fits.
- **No capacity.** The pile stops growing at `heap` above the rim, but the bin still takes more, each one landing in the same space.
- **The opening is treated as a rectangle**, but the dustbin is round. A margin in from the edges hides this for small things, but not for things nearly the bin's width.

### What the maths says about the ceiling

For the path to come down within 10° of vertical, the top of the arc must rise above the rim by about the remaining horizontal distance ÷ (2 × tan 10°), which is roughly 2.8 times that distance. With the top of the arc 0.3 m short of the bin, that is 0.85 m above the rim. That puts it about 1.85 m up for a skip (rim 1 m) and about 1.55 m for the dustbin (rim 0.7 m): well under every room's ceiling (2.5 m corridors, 3 m dev rooms). The whole flight then takes about 0.8 s. So the ceiling rarely limits the shot. The exception is under a duct or cable tray, which are static set dressing and not in the model.

### Questions

1. **Trigger — answered:** USE or LET GO while holding an item and targeting a bin both guarantee a toss. The old magnet that diverts a let go aimed merely near the bin is removed; this follows from the owner's targeting rule.
2. **Range — answered:** a bin is tossable whenever it is in its ordinary use range; USE and LET GO share that range.
3. **Too big to fit — deferred:** all holdable items are tossable for now, including ones larger than the bin's interior. Restrictions and a class of items that cannot be binned may be added later.
4. **Full bins — answered:** no capacity or full state; items continue to settle on the pile. Emptying and resets are separate from toss acceptance.
5. **Round bins — superseded:** use a circular target zone for every bin, configured by local Y-height and radius, regardless of the bin's outer shape.
6. **The ceiling — answered:** ignore ceilings and ducts in the first version; no ceiling-fit requirement is imposed on the trajectory.
7. **Turning in flight — answered:** keep turning the item toward a flat resting orientation; no tumbling in this version.
8. **The carton — answered:** it is fixed on the engineer's office floor; only stationary bins receive tosses. A carried bin and moving one with contents are outside this design.
9. **Picking things out — answered:** every bin's contents remain pick-upable and carryable; future bins may opt into despawning, but that is deferred.
