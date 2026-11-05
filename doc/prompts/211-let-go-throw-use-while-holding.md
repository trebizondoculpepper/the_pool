# 211: Let go of its own: putting down, throwing, dropping, and using while holding

The owner, 2026-11-05: "I want the use button to not drop an object, so we can use a ladder while holding an object", and throwing: "The object follows a parabolic arc until it hits the floor. If it hit vertical bounding box it can reflect off that with reduced momentum. Should be similar to throwing things into a bin. We probably need to think about throwing, dropping." Split from the animation on the owner's word (2026-11-05): the pick-up and put-down animations are [210](210-pick-up-put-down-animated.md). The owner subsequently separated bin tossing into [209](209-bin-toss-trajectory.md), a different mechanic; this brief governs general throwing, dropping, placement choice and use while holding. The owner has settled the design below; implementation is pending. See [the implementation plan](../plans/211-let-go-throw-use-while-holding.md). Apply it everywhere at once in the one control scheme (`src/toolkit/controls/`), per the rule that new behaviour goes into the game's systems, never a special case. Builds on missions 116 (the carrying cues), 181 and 189 (supportable and holdable), and 208 (bounds models).

## Today (checked 2026-11-05)

- One input does everything: click, E, tap or the pad's A is "use / pick up / drop" (`controls/logic/controls.ts`). While carrying, it lets go unless a room's `useWhileHolding` takes it first; so a ladder, a door or a knob cannot be worked with something in hand, except room by room.
- Letting go: aimed at a place that takes it, it snaps in; otherwise it falls from the hand by its drop profile. Nothing is thrown.
- The bin toss (the `bin-like` trait) is the only arc: a fixed parabola into the bin (mission 209 is on its trajectory).
- For comparison, Minecraft: a drop key of its own (Q; the pad's B; a long press on touch) tosses the held item a short way forward, where it lands with a little physics; use (right-click) works what is aimed at, or places a block on the aimed face, and never drops; ladders are climbed whatever is held; throwables follow a parabola and do not bounce.

## Settled

1. **Let go is its own action** (the owner, 2026-11-05): keyboard **Q**, the gamepad's **B**, and a **LET GO** button on touch while carrying (mouse players use Q; right-click is left alone, as Minecraft players expect it to use or place). General use never invokes a drop or general throw: with something in hand, use works whatever is aimed at (a ladder, a door, a knob), the thing staying in hand. USE or LET GO targeting a bin starts the guaranteed toss governed by 209.
2. **The overlay shows it while something is held** (the owner, 2026-11-05): the let-go control is flashed on the overlay when something is picked up, and shown while it is held (the carrying help line, `carryingHelp`, for each input).
3. **Placement and general throwing are different inputs** (the owner, 2026-11-05): USE at a clear aimed spot on a valid supportable top starts 210's direct, eased hand movement. USE at a wall, floor, occupied or otherwise invalid spot leaves the thing in hand. Socket and plug placement are entirely outside these features; preserve their current behaviour without designing the future traits here. LET GO releases the item: aimed down it behaves as a drop, aimed outward as a throw. There is no separate drop input. USE or LET GO targeting a bin starts 209's guaranteed toss.
4. **General throw flight** (the owner, 2026-11-05): launch initially approximately toward the aimed target and follow a parabolic arc until ground contact. On hitting a vertical solid's bounding box, ricochet with roughly 20–30% momentum loss per impact, tuned by feel as in mission 209's bin interior. Do not yet add rolling by shape, bouncing by material, metallic clatter, or other material-specific behaviour; those can follow later when shape and material traits support them.
5. **Held items only** (the owner, 2026-11-05): throwing, dropping and bin tossing require a picked-up `holdable` item. `Luggable` objects cannot be picked up, so none of these actions applies to them.
6. **Gamepad crouch** (the owner, 2026-11-05): B is LET GO during play, so crouch moves to the right stick's click. B remains Back in menus.
7. **Throw strength** (the owner, 2026-11-05): a general throw has one fixed, leisurely launch speed selected by the game. Holding LET GO does not charge it; throw strength is not an important part of the simulation. Mission 209 separately calculates each bin toss's plausible speed to enter its target zone.
8. **Water** (the owner, 2026-11-05): projectile motion may ignore water and let an object fall to a pool's bottom as if the water were absent. There are currently no holdable objects in water rooms, so water effects are low priority and need no dedicated feature in this mission. Density, floating, buoyancy and drag are later work.
9. **Collision scope** (the owner, 2026-11-05): implement the simplest useful collision with solid geometry. Thrown items do not hit the player, knock loose items aside, press controls, or break glass in this version.
10. **Supportable tops** (the owner, 2026-11-05): when a thrown object's flight reaches a desk, shelf or other supportable top, the existing support-landing rule applies; it may rest there instead of passing through to the floor.
11. **Room boundary** (the owner, 2026-11-05): carrying or throwing objects between rooms is a later feature. This version keeps a thrown item in its current room; it does not transfer the item through a doorway into another scene.
12. **Persistence** (the owner, 2026-11-05): saving an item's loose location is a future mission. This version retains today's room-reset behaviour when the player leaves and returns.
13. **Landing sound** (the owner, 2026-11-05): use one neutral sound for a general throw or drop landing. Trait-based material sounds are later work. Mission 210's deliberate pick-up and placement stay silent.
14. **Mouse-only LET GO** (the owner, 2026-11-05): defer a pointer-operated LET GO button on desktop. This version uses Q on keyboard, B on gamepad and the touch LET GO button; mouse-only access can be added later.

## Implementation notes and deferrals

- **What let go does, by what is aimed at:** a targeted bin gets 209's guaranteed toss; otherwise LET GO throws. USE handles deliberate generic surface placement. Existing socket and plug uses remain until their own traits are designed.
- **Throw tuning:** choose a fixed leisurely launch speed for the room scale and tune the 20–30% wall rebound loss by feel. Supportable tops stop a descending throw as in mission 181; other solid collisions may use the simplest consistent response.
- **Dropping:** LET GO aimed down makes a short release toward the floor; it is the same projectile action as throwing outward, not 210's deliberate placement.
- **Use while holding:** ordinary use (ladders, doors, knobs, buttons) works with something in hand. Keep existing room `useWhileHolding` cases until their future traits are designed; do not add another room-specific exception.
- **Pure parts:** the arc and its bounces, and the choice of action by aim, pure logic in `controls/logic/`, tested; the views only move objects.
- **Cues:** use the existing carrying glyphs where they fit: put down for valid USE placement, toss for a targeted bin, throw for LET GO elsewhere, and an impossible-action cue for invalid USE. Fragility, shape and material responses are later work, outside this mission's first throwing mechanic.

## Records

Keep `TODO.md` current. Update the controls' guide (`src/toolkit/controls/AGENTS.md`) and help text in `controls.ts` when the behaviour ships.

## Earlier code analysis and answered questions (ahnaa_dmitrieva, 2026-11-05)

Checked against the code on 2026-11-05. Questions are numbered so they can be answered by number; the first ones block the most.

### Conflicts with the controls as they are

- **The gamepad's B is already crouch** (`controls.ts`, "B: crouch"), and in menus it means back. Let go on B needs crouch moved, or let go put elsewhere. The pad's X is the torch, Y is inspect, and LB and RB turn knobs.
- **Q already rolls the camera** while flying (noclip, `first-person.ts`). That only matters in the developer's flying mode, but it would need choosing between there.
- **Mouse-only players** (a trackpad with no keyboard to hand) have no let-go input in this version; the owner deferred an on-screen desktop LET GO button. Right-click remains unchanged.

### Inconsistencies identified before the rulings above

- **Put in: use or let go?** The proposal lists "put in (a home slot, a socket)" under let go. But fitting a board into the repair room's socket, or a fuse into its holder, is today a use while holding, and in Minecraft placing is a use (right-click). One rule is wanted for "put this thing into that".
- **Let go aimed at a bin.** This brief says bin use is 209's, and 209 says the toss starts from use. Let go aimed at a bin would then be a general throw that can miss and bounce off. What 205 built today is let go near a bin, which tosses it in.
- **No valid place.** 210 says that with no valid place, the thing stays in hand. This brief's proposal says let go aimed at anything else throws it. These are the same question from two sides.
- **Material behaviour.** The brief defers sounds by material, but dropped things already make a sound by their drop profile's material (board, plastic, metal, ceramic), and land with a little bounce and roll.

### Gaps found

- **Where throws can end up:**
  - In the pools: the walker now wades and swims (202), so a thrown thing can land in water. Does it sink, float, or is it lost?
  - Over a drop: the walker can never fall more than 1 m, but a thrown thing could go over a gantry's edge or down a stair.
  - Out of the room: through a doorway, into a corridor of the pool loop, which belongs to another room's scene.
- **What a throw can hit:**
  - The player.
  - Other loose things, which might be knocked aside.
  - Controls: a thrown thing hitting a button could press it.
  - Lamps and glass, which might break.
- **Saving:** loose things are not in the world state today. Where a thing was thrown is forgotten when you leave the room or reload.
- **Climbing a ladder while holding something:** nothing says whether the held thing hides the view or catches on the ladder's cage.

### Questions

1. **Gamepad — answered:** B is LET GO during play; crouch moves to right-stick click. B remains Back in menus.
2. **Put in — outside scope:** sockets, slots and plugs belong to later traits. Preserve today's behaviour and avoid making those traits harder to add; do not design them in 211.
3. **Let go at a bin — answered:** USE or LET GO with a held item and a targeted bin both start 209's guaranteed toss.
4. **No valid place — answered by input split:** invalid USE keeps the object in hand; LET GO without a targeted bin releases it on the aimed trajectory. Looking down yields a short drop; no separate drop gesture is needed.
5. **Throw strength — answered:** one fixed, leisurely speed for general throws, chosen by the game and tuned for the rooms; no charge input. Bin tosses calculate their own speed to meet the target zone.
6. **Thrown into a pool — deferred edge case:** no current water room has holdable objects. If one is thrown into water, it may simply fall to the basin bottom as if the water were absent; no water-specific implementation is required now.
7. **What a throw can hit — answered:** solid geometry only in this version; no effects on the player, loose items, controls or glass.
8. **Tops in flight — answered:** apply the support rule; thrown things can land on supportable tops.
9. **Doorways — answered:** no cross-room transfer in this version; the object remains in its current room. Cross-room carrying and throwing are later work.
10. **Persistence — answered:** item-location persistence is a future mission; reset loose positions with the room as now.
11. **Existing drop sounds — answered:** one neutral landing sound for general throws and drops; trait-based sounds later.

## Review after 209 and 210 were built (ahnaa_dmitrieva, 2026-11-05)

210 could not ship without a way to let go (USE no longer drops), so **211's input shipped with it**: Q, the pad's B, touch LET GO, crouch on the right stick's click, and the help line. LET GO aimed at a bin tosses it in (209); anywhere else the thing leaves the hand and falls by its drop profile, as before. What 211 still adds is the throw itself. Points for the owner before it is built:

1. **Rebounds need not wait for 208.** Every room already gives the walker its walls and solid things as floor-plan rectangles (`solids`). A throw can rebound off those as vertical faces now, and use 208's bounds models when they exist. Shall the first version do that, instead of waiting?
2. **"Aimed down is a drop".** The brief gives no angle. At a leisurely fixed speed, a throw aimed steeply down lands about half a metre ahead anyway. Can there simply be no threshold, so that one rule covers both?
3. **The neutral landing sound is a loss.** Every portable already sounds by its drop profile's material (board, plastic, metal, ceramic) when dropped. One neutral sound would replace those everywhere. Should the existing sounds be kept for drops and rebounds?
4. **LET GO at a bin that refuses.** Hall 5's bin takes only the finds. Today LET GO at it with anything else keeps the thing in hand, and the cue is red. Should it instead be thrown, and bounce off?
5. **While inspecting.** LET GO does nothing while the thing is held up to look at (X, INSPECT or Y held). Is that right, or should it let go from there?
6. **Ladders.** These already work with something in hand: a use at a ladder mounts it before the hands are asked. Nothing more is needed for "use a ladder while holding", unless the held thing should be hidden while climbing.
