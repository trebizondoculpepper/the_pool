# Mission 209: the bin toss's trajectory

The owner, 2026-11-05, while mission 205 made `bin-like` a trait: the arc a thrown thing follows into a bin wants its own mission ("I think there's a lot to discuss with bin tossing"). Brief only; discuss with the owner, one question at a time, before building.

## Today

`binArc` (`src/toolkit/components/site-dressing/logic/bin-toss.ts`) goes straight across the floor plan from where the thing is let go to its rest on the pile, with a parabola in height that rises a fixed 0.25 m above the higher end. Nothing makes it come down through the bin's opening: from far off, from low down, or landing near an edge, it can pass through the bin's side or rim.

## The owner's ideas so far (2026-11-05)

- **A target plane.** A bin has a target area: a bounded plane, usually within the object (a skip's opening at its rim). The parabola is chosen so that the thing's path crosses that plane, inside its bounds.
- **As near the normal as the room allows.** The path should cross the plane at the least angle to its normal (coming down as near vertically as it can). With an infinitely high ceiling it could always come in almost along the normal; the room's ceiling limits how high the lob can go, so it takes its best shot under it.
- **Good enough.** Anything within about 10° of the normal is fine.

## Settled with the owner (2026-11-05)

- **Trigger and reach.** Using a `bin-like` object while holding an item starts the bin toss only within the bin's normal use range. This is a third projection category, separate from deliberate placement and the general throw in [211](211-let-go-throw-use-while-holding.md).
- **Trait scope.** Every object with the `bin-like` trait has this behaviour. All current bin-like objects have an open top, so no additional trait is required. If other bin shapes are added later, refine the trait model then.
- **Intended objects.** The skip, the Rubbermaid-style cylindrical dustbin, and the engineer's office cardboard carton all need `bin-like`. The carton is also `box-like`; this is a combination of traits, not a separate bin-toss rule. At the time of this brief, only `skip` is marked `bin-like` in the kind registry; registering and binding the dustbin and carton remains work for mission 205 and the engineer's office TODO item.
- **Flight.** The toss evokes an underarm throw: the object travels upward toward the bin on a parabolic arc, chosen to pass down through the bin's bounded opening plane. It is aimed at the bin rather than merely launched in the player's facing direction.
- **Guaranteed success.** A bin toss always enters the opening. Once below that plane, the object is constrained by the bin's interior bounds and settles inside it. The path must not pass through the bin's side or rim.

## Points to settle

- How a bin declares its target plane (its builder, as with the bounds model of mission 208, or derived from its body's rim).
- The thing's size as a margin in from the plane's edges, and long things going in lengthways.
- Flight time: a higher lob takes longer; time it by gravity rather than by horizontal distance.
- Where the ceiling comes from (the room's flight bounds, or the derived surfaces overhead), and what to do under a low duct.
- How the existing aim angle and magnet interact with the normal-use-range trigger; tossing from farther away is outside this first version.
- A first draft of the pure maths (target plane, crossing point, least lift that enters the plane) was written and withdrawn on 2026-11-05 at the owner's word; it is in this session's history if wanted.

## Analysis and questions for the owner (ahnaa_dmitrieva, 2026-11-05)

Checked against the code after mission 205 finished (`ca6a0ff9`). Questions are numbered so they can be answered by number; the first ones block the most.

### Out of date in this brief

- "Only `skip` is marked `bin-like`": the `dustbin` kind is now registered and bin-like too (205), and the skip in the repair room, the skimmer reveal and Hall 5's waste bin all come from the trait. The carton is still not bin-like (its own put-in code, `createDeskCarton`).
- A bin already declares an inside: `markBin(group, { shape, footprint })`, where `shape` gives the inside's half-width and half-depth at the bottom, its floor and its rim height. The opening plane can be derived from that (at `rim`, the size of the footprint less the walls) with no new declaration.

### Inconsistencies

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

1. **Trigger:** confirm that _use_ aimed at a bin while holding something tosses it in, and that the 205 magnet (let go near a bin, and it goes in) is removed once 211 makes let go its own action. Or should let go aimed at a bin also toss it in?
2. **Range:** one range for all of this, so that a bin can be tossed into from wherever it can be used? If so, how far: 1.5 m as now, 2 m, or the general 3.2 m use reach?
3. **Too big to fit:** for a thing longer than the bin's inside, should it be refused (the red cue), go in standing on end and stick out, or lie across the top?
4. **Full bins:** should a bin have a capacity, after which it refuses? Does it ever get emptied, other than by a room's reset?
5. **Round bins:** should a round bin get a round opening (a disc at the rim), or is a square inside a circle good enough?
6. **The ceiling:** since a 10° entry fits under every room ceiling we have, can the first version ignore the ceiling and ducts, with a test that fails if a room is ever too low?
7. **Turning in flight:** today the thing turns to lie flat as it flies. Should it keep turning that way, keep the way it was held, or tumble?
8. **The carton:** it is holdable and sits on a desk, so its opening is not at a fixed height. Should a bin that is carried, or one standing on a top, take tosses? And if you pick up a carton with things in it, do they go with it?
9. **Picking things out:** dev5's bins let you take things out again, and the three game rooms' bins keep them. Is that per room (as now), or one rule for every bin?
