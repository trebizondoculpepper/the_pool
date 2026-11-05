# 210: Picking up and putting down, animated

The owner, 2026-11-05: "When objects are picked up or placed, that should be animated." Split from the let-go discussion on the owner's word (2026-11-05): this mission is the two animations; letting go, throwing, dropping and using while holding are [211](211-let-go-throw-use-while-holding.md). **A discussion brief, not for implementation yet:** the design is settled with the owner one question at a time, with `nicole_buruaah`. Everywhere at once, in the one control scheme (`src/toolkit/controls/`), per the rule that new behaviour goes into the game's systems, never a special case. Builds on missions 116 and 117 (the carrying cues and inspecting) and 181 and 189 (supportable and holdable).

## The owner's request

- **Picking up:** the object moves from its resting place to the held position, with an animation that eases in and out.
- **Placing:** if put down on a surface, the reverse of picking up.

## Today (checked 2026-11-05)

- Picking up: the thing goes straight into the hand's frame and is pulled the rest of the way by an exponential smoothing (`held.grab.lerp(…, dt * 12)` in `controls/input/object-handling.ts`): it eases out, not in, and has no set duration. Inspecting (117) swings it to the middle of the view the same way.
- Putting down: aimed at a place that takes it (its home slot, a socket, a carton), it snaps in at once; otherwise it falls from the hand by its drop profile onto the floor or a supportable top (`logic/support-landing.ts`). Nothing is placed with a move of its own.

## Settled with the owner (2026-11-05)

1. Picking up and putting down each take about half a second, easing in and out. The object follows the most direct route between its starting place and the hand, or between the hand and its destination. These are deliberate hand-guided moves, not throws.
2. Once started, either animation completes even if the walker moves or turns. A placement destination is chosen when the action starts and stays fixed in the world; later movement does not redirect it. Placement has no bounce, ricochet or other physics effect.
3. Placement resolves an aimed valid place, allowing a snap to a nearby valid position. If there is no valid position, the object stays in hand and no placement begins. Throwing or dropping without a valid placement target belongs to [211](211-let-go-throw-use-while-holding.md).
4. Keep these animations silent for now; sound can be added later.

## Proposed, still to settle (one question at a time)

- **During the move:** whether the thing can be inspected or let go of before the animation completes, and how the hand's endpoint follows a moving walker during pick-up.
- **Placement target:** how close a valid position must be to the aimed spot for the snap to count, and how to indicate that no valid placement is available.
- **The same for every portable** in every room, the rooms' own snaps (put-back, sockets, the carton) included.
- **Implementation:** one pure tween (`controls/logic/`, tested) for position and turn; placing ends flat on its chosen support.

## Records

When the design is settled: a plan, `TODO.md`, the controls' guide (`src/toolkit/controls/AGENTS.md`).

## Analysis and questions for the owner (ahnaa_dmitrieva, 2026-11-05)

Checked against the code on 2026-11-05. Questions are numbered so they can be answered by number; the first ones block the most.

### Inconsistencies

- **No valid place: kept in hand, or thrown?** Settled point 3 here says that with no valid place the thing stays in hand and nothing begins. 211's proposal says let go aimed at anything that is not a place throws it. Both can hold only if putting down and throwing are different inputs, or if "let go" means put down when there is a place and throw when there is not.
- **Which input places?** Neither brief says which input starts a put-down. Today it is use (click, E, tap, A). 211 makes use never let go, and lists "put down" and "put in" under the new let go (Q, pad B, touch LET GO). So placing would move from use to let go, but inserting a fuse into its holder is today a use while holding (the repair room's `useWhileHolding`).
- **The end point of a pick-up moves.** Settled point 2 says a destination is fixed in the world once chosen. That holds for a put-down, but a pick-up's destination is the hand, which moves with the walker.

### Defects and risks found

- **Reach makes half a second look like telekinesis.** Things can be picked up from up to 3.2 m away (`destination.reach ?? 3.2`). Covering 3 m in 0.5 s is 6 m/s, so a thing at the edge of reach would leap to the hand.
- **The direct route ignores what is in the way.** A straight line from a shelf to the hand, or from the hand to a desk, can pass through a shelf above, a desk edge or the walker's own body.
- **The rooms' own snaps have side effects.** Every snap in today's rooms (a portable's own home, a board's socket in the repair room, the controls room's targets, dev5's skip) goes through `PlacementTarget.place`, and some set things off at once (sparks, a lamp, a count). With an animation, these must run when it ends, not when it starts.
- **How a placed thing ends up turned is not settled.** It may have been turned by hand or swung up to be inspected (117) while held.
- **An object half-way through a move** has no state today (installed, held, falling, settled).

### Questions

1. **Inputs:** does a put-down start from let go (Q / pad B / touch LET GO, with 211), from use, or from either?
2. **No valid place:** with let go and no valid place, should the thing stay in hand (this brief), or be thrown (211)? If it stays in hand, should the cue be a red ×?
3. **Distance:** should a move always take 0.5 s, or take longer for longer distances (about 0.5 s at arm's length, more beyond)? Or should pick-up reach be cut to arm's length (about 1 m)?
4. **Obstacles:** may the move pass through things (the desk edge, the walker), or should it go around (lifting up, then across)?
5. **How it ends up turned:** when put down, does a thing land upright as it was found (its `flat` setting), as it is held now, or squared to the surface's nearest edge?
6. **During the move:** can it be inspected, let go of, or used while still moving? The proposal is not until it arrives.
7. **Snap distance:** how far from the aimed spot may a put-down snap to a valid place: a few centimetres, a hand's breadth (about 10 cm), or anywhere on the aimed top?
8. **What a valid place is:** a top with enough free room for the thing's footprint, so things don't overlap. Must a thing overhang the edge by less than half (181's open point)? And is putting a thing on another holdable stacking (206), which is otherwise refused?
9. **Side effects:** confirm that a snap's effect (a board seated, a count, a spark) happens when the move ends.
10. **Weight:** do luggable things (190) move the same way, or more slowly?
