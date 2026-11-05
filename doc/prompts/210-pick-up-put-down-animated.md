# 210: Picking up and putting down, animated

The owner, 2026-11-05: "When objects are picked up or placed, that should be animated." Split from the let-go discussion on the owner's word (2026-11-05): this mission is the two animations; letting go, throwing, dropping and using while holding are [211](211-let-go-throw-use-while-holding.md). The owner has settled the design below; implementation is pending. See [the implementation plan](../plans/210-pick-up-put-down-animated.md). Apply it everywhere at once in the one control scheme (`src/toolkit/controls/`), per the rule that new behaviour goes into the game's systems, never a special case. Builds on missions 116 and 117 (the carrying cues and inspecting) and 181 and 189 (supportable and holdable).

## The owner's request

- **Picking up:** the object moves from its resting place to the held position, with an animation that eases in and out.
- **Placing:** if put down on a surface, the reverse of picking up.

## Today (checked 2026-11-05)

- Picking up: the thing goes straight into the hand's frame and is pulled the rest of the way by an exponential smoothing (`held.grab.lerp(…, dt * 12)` in `controls/input/object-handling.ts`): it eases out, not in, and has no set duration. Inspecting (117) swings it to the middle of the view the same way.
- Putting down: aimed at a place that takes it (its home slot, a socket, a carton), it snaps in at once; otherwise it falls from the hand by its drop profile onto the floor or a supportable top (`logic/support-landing.ts`). Nothing is placed with a move of its own.

## Settled with the owner (2026-11-05)

1. Picking up and putting down each take about half a second, easing in and out, at every valid interaction distance. Keep today's pick-up reach (normally up to 3.2 m); the speed and reach can be tuned later. The object follows the most direct route between its starting place and the hand, or between the hand and its destination. These are deliberate hand-guided moves, not throws (the owner, 2026-11-05).
2. Once started, either animation completes even if the walker moves or turns. A placement destination is chosen when the action starts and stays fixed in the world; later movement does not redirect it. Placement has no bounce, ricochet or other physics effect.
3. USE while holding starts deliberate placement at the exact aimed spot on a valid supportable top (such as a desk), if the spot is clear. There is no nearby search. USE at an invalid or occupied spot, a vertical surface or the floor leaves the object in hand and starts no placement. LET GO is a separate input under [211](211-let-go-throw-use-while-holding.md) and releases the item; targeting a bin with either input invokes 209's guaranteed toss (the owner, 2026-11-05).
4. Keep these animations silent for now; sound can be added later.
5. The animation follows the straight direct path even if that path crosses a desk edge, shelf or the player's body; it does not route around obstacles in this version (the owner, 2026-11-05).
6. A generic surface placement ends with the item flat on its support. Future `rackable` and `stackable` traits will define their own arrangement. The first version does not need to preserve the rotation chosen while holding or simulate an item tipping from a narrow edge (the owner, 2026-11-05).
7. Mid-animation inspection, use and let-go interactions need no special handling in the first version; let the brief move complete and revisit interruptions only if playtesting shows a need (the owner, 2026-11-05).
8. Generic placement on a desk requires all four bottom corners of the item to lie within the desk's upper support surface; no corner may overhang. A shelf's replacement placement is governed by the future `rackable` trait, which arranges an item on the shelf even if its authored starting position was messy. Placing one loose item on another requires `stackable` and is unavailable until that trait exists (the owner, 2026-11-05).
9. Socket, plug and similar dedicated target placement, including their final pose and side effects, belongs to future traits and is outside this brief. Existing socket behaviour remains as it is until that work (the owner, 2026-11-05).
10. This animation applies to picked-up `holdable` items. `Luggable` things cannot be picked up, and their movement is outside this brief (the owner, 2026-11-05).

## Implementation notes and deferrals

- **During the move:** complete the short animation before applying another action to that item. The held endpoint follows the moving player's hand during pick-up; the placement destination remains fixed from the start.
- **Placement feedback:** use the existing impossible-action cue when the aimed spot is invalid, rather than adding a new control or state.
- **The same for every holdable** in every room wherever generic surface placement applies; socket, plug and arrangement traits are separate work.
- **Implementation:** one pure tween (`controls/logic/`, tested) for position and turn; generic placement ends flat on its chosen support.

## Records

Keep `TODO.md` current. The controls' guide (`src/toolkit/controls/AGENTS.md`) should be updated when the behaviour ships.

## Earlier code analysis and answered questions (ahnaa_dmitrieva, 2026-11-05)

Checked against the code on 2026-11-05. Questions are numbered so they can be answered by number; the first ones block the most.

### Inconsistencies identified before the rulings above

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

1. **Inputs — answered:** USE starts a deliberate put-down when its aimed generic surface placement is valid. LET GO is the separate action in 211. Dedicated targets are outside this brief.
2. **No valid place — answered by input split:** invalid USE leaves the object in hand and shows the existing impossible-action cue; LET GO with no bin target throws under 211.
3. **Distance — answered:** keep the current pick-up reach and about 0.5 s at every valid distance; tune later if the long move looks wrong.
4. **Obstacles — answered:** fly straight between endpoints; no obstacle avoidance in this version.
5. **How it ends up turned — answered:** generic surface placement ends flat; dedicated target poses are outside this brief, and future arrangement traits may define their own poses.
6. **During the move — deferred:** keep the first version simple and complete the short move before other actions on that item; add interruption behaviour only if needed later.
7. **Snap distance — answered:** no nearby search; USE tries the exact aimed spot on a valid supportable top. Dedicated socket or slot placement is outside this brief.
8. **What a valid place is — answered:** a generic desk placement requires all four bottom corners within the upper support surface, with no overhang. Shelf replacement belongs to `rackable`; placing atop another loose item belongs to `stackable` and cannot happen before that trait exists.
9. **Side effects — outside scope:** socket and plug traits will own their placement and effects later; existing behaviour stays as it is for now.
10. **Weight — answered:** `luggable` objects cannot be picked up; 210 applies to held `holdable` objects only.
