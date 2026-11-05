# Mission 209: the bin toss's trajectory

The owner, 2026-11-05, while mission 205 made `bin-like` a trait: the arc a thrown thing follows into a bin wants its own mission ("I think there's a lot to discuss with bin tossing"). Brief only; discuss with the owner, one question at a time, before building.

## Today

`binArc` (`src/toolkit/components/site-dressing/logic/bin-toss.ts`) goes straight across the floor plan from where the thing is let go to its rest on the pile, with a parabola in height that rises a fixed 0.25 m above the higher end. Nothing makes it come down through the bin's opening: from far off, from low down, or landing near an edge, it can pass through the bin's side or rim.

## The owner's ideas so far (2026-11-05)

- **A target plane.** A bin has a target area: a bounded plane, usually within the object (a skip's opening at its rim). The parabola is chosen so that the thing's path crosses that plane, inside its bounds.
- **As near the normal as the room allows.** The path should cross the plane at the least angle to its normal (coming down as near vertically as it can). With an infinitely high ceiling it could always come in almost along the normal; the room's ceiling limits how high the lob can go, so it takes its best shot under it.
- **Good enough.** Anything within about 10° of the normal is fine.

## Points to settle

- How a bin declares its target plane (its builder, as with the bounds model of mission 208, or derived from its body's rim).
- The thing's size as a margin in from the plane's edges, and long things going in lengthways.
- Flight time: a higher lob takes longer; time it by gravity rather than by horizontal distance.
- Where the ceiling comes from (the room's flight bounds, or the derived surfaces overhead), and what to do under a low duct.
- Whether aim and reach (1.5 m, 40°, the 2 m magnet) change.
- A first draft of the pure maths (target plane, crossing point, least lift that enters the plane) was written and withdrawn on 2026-11-05 at the owner's word; it is in this session's history if wanted.
