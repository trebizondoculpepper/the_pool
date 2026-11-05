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
