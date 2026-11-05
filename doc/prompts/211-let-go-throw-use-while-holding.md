# 211: Let go of its own: putting down, throwing, dropping, and using while holding

The owner, 2026-11-05: "I want the use button to not drop an object, so we can use a ladder while holding an object", and throwing: "The object follows a parabolic arc until it hits the floor. If it hit vertical bounding box it can reflect off that with reduced momentum. Should be similar to throwing things into a bin. We probably need to think about throwing, dropping." Split from the animation on the owner's word (2026-11-05): the pick-up and put-down animations are [210](210-pick-up-put-down-animated.md). The owner subsequently separated bin tossing into [209](209-bin-toss-trajectory.md), a different mechanic; this brief governs general throwing, dropping, placement choice and use while holding. **A discussion brief, not for implementation yet:** the design is settled with the owner one question at a time, with `nicole_buruaah`. Everywhere at once, in the one control scheme (`src/toolkit/controls/`), per the rule that new behaviour goes into the game's systems, never a special case. Builds on missions 116 (the carrying cues), 181 and 189 (supportable and holdable), and 208 (bounds models).

## Today (checked 2026-11-05)

- One input does everything: click, E, tap or the pad's A is "use / pick up / drop" (`controls/logic/controls.ts`). While carrying, it lets go unless a room's `useWhileHolding` takes it first; so a ladder, a door or a knob cannot be worked with something in hand, except room by room.
- Letting go: aimed at a place that takes it, it snaps in; otherwise it falls from the hand by its drop profile. Nothing is thrown.
- The bin toss (the `bin-like` trait) is the only arc: a fixed parabola into the bin (mission 209 is on its trajectory).
- For comparison, Minecraft: a drop key of its own (Q; the pad's B; a long press on touch) tosses the held item a short way forward, where it lands with a little physics; use (right-click) works what is aimed at, or places a block on the aimed face, and never drops; ladders are climbed whatever is held; throwables follow a parabola and do not bounce.

## Settled

1. **Let go is its own action** (the owner, 2026-11-05): keyboard **Q**, the gamepad's **B**, and a **LET GO** button on touch while carrying (mouse players use Q; right-click is left alone, as Minecraft players expect it to use or place). General use never invokes a drop or general throw: with something in hand, use works whatever is aimed at (a ladder, a door, a knob), the thing staying in hand. Bin use is governed by 209.
2. **The overlay shows it while something is held** (the owner, 2026-11-05): the let-go control is flashed on the overlay when something is picked up, and shown while it is held (the carrying help line, `carryingHelp`, for each input).
3. **Placement and general throwing are different actions** (the owner, 2026-11-05): deliberate placement uses 210's direct, eased hand movement to a valid place near the aimed spot; if no valid place exists, the thing stays in hand. A general throw can launch almost anywhere and follows its own trajectory.
4. **General throw flight** (the owner, 2026-11-05): launch initially approximately toward the aimed target and follow a parabolic arc until ground contact. On hitting a vertical solid's bounding box, ricochet with reduced momentum. Use a fixed reduction for now. Do not yet add rolling by shape, bouncing by material, metallic clatter, or other material-specific behaviour; those can follow later when shape and material traits support them.

## Proposed, still to settle (one question at a time)

- **What let go does, by what is aimed at:** a supportable surface within reach (a desk, a shelf, the floor near the feet): put down there (210's animation); a place that takes it (its home slot, a socket): put in (210's animation); anything else: thrown. Bin use is a separate action governed by 209.
- **Throw speed and collision detail:** choose one fixed launch speed after checking ordinary human throws and the game's room scale; decide whether the speed is charged by holding let go, the fixed momentum reduction on a vertical rebound, whether a supportable top stops the flight like the floor, and how collisions with nonvertical faces behave.
- **Dropping:** let go aimed at the floor at the feet puts the thing down there; no separate drop.
- **Use while holding:** every use (ladders, doors, knobs, buttons) works with something in hand; the rooms' own `useWhileHolding` cases fold into it or stay where holding the thing changes what the use does (a fuse into a holder).
- **Pure parts:** the arc and its bounces, and the choice of action by aim, pure logic in `controls/logic/`, tested; the views only move objects.
- Open: throw range; whether fragile things break; sounds for a throw's bounces; what the cue shows for each action (116's glyphs: put down, put in, toss, throw). Shape and material responses are later work, outside this mission's first throwing mechanic.

## Records

When the design is settled: a plan, `TODO.md`, the controls' guide (`src/toolkit/controls/AGENTS.md`) and the help text in `controls.ts`.
