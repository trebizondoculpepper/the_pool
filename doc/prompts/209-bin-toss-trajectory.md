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
