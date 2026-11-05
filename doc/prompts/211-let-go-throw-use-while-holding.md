# 211: Let go of its own: putting down, throwing, dropping, and using while holding

The owner, 2026-11-05: "I want the use button to not drop an object, so we can use a ladder while holding an object", and throwing: "The object follows a parabolic arc until it hits the floor. If it hit vertical bounding box it can reflect off that with reduced momentum. Should be similar to throwing things into a bin. We probably need to think about throwing, dropping." Split from the animation on the owner's word (2026-11-05): the pick-up and put-down animations are [210](210-pick-up-put-down-animated.md). **A discussion brief, not for implementation yet:** the design is settled with the owner one question at a time, with `nicole_buruaah`. Everywhere at once, in the one control scheme (`src/toolkit/controls/`), per the rule that new behaviour goes into the game's systems, never a special case. Builds on missions 116 (the carrying cues), 181 and 189 (supportable and holdable), 205 and 209 (bin-like and the bin toss's arc) and 208 (bounds models).

## Today (checked 2026-11-05)

- One input does everything: click, E, tap or the pad's A is "use / pick up / drop" (`controls/logic/controls.ts`). While carrying, it lets go unless a room's `useWhileHolding` takes it first; so a ladder, a door or a knob cannot be worked with something in hand, except room by room.
- Letting go: aimed at a place that takes it, it snaps in; otherwise it falls from the hand by its drop profile. Nothing is thrown.
- The bin toss (the `bin-like` trait) is the only arc: a fixed parabola into the bin (mission 209 is on its trajectory).
- For comparison, Minecraft: a drop key of its own (Q; the pad's B; a long press on touch) tosses the held item a short way forward, where it lands with a little physics; use (right-click) works what is aimed at, or places a block on the aimed face, and never drops; ladders are climbed whatever is held; throwables follow a parabola and do not bounce.

## Settled

1. **Let go is its own action** (the owner, 2026-11-05): keyboard **Q**, the gamepad's **B**, and a **LET GO** button on touch while carrying (mouse players use Q; right-click is left alone, as Minecraft players expect it to use or place). **Use never lets go**: with something in hand, use works whatever is aimed at (a ladder, a door, a knob), the thing staying in hand.
2. **The overlay shows it while something is held** (the owner, 2026-11-05): the let-go control is flashed on the overlay when something is picked up, and shown while it is held (the carrying help line, `carryingHelp`, for each input).

## Proposed, still to settle (one question at a time)

- **What let go does, by what is aimed at:** a supportable surface within reach (a desk, a shelf, the floor near the feet): put down there (210's animation); a place that takes it (its home slot, a socket): put in (210's animation); a `bin-like` thing: tossed in on 209's arc; anything else: thrown.
- **Throwing:** leaves the hand along the view at a set speed (proposed: about 4 m/s, a few metres, rather than charged by holding let go: the game is not about throwing skill, bins already pull a near miss in, and let go stays one meaning), a parabola under gravity; a vertical face (a wall, a solid's bounds, 208's bounds models) reflects it with reduced momentum (a restitution); on reaching the floor or a supportable top, the drop profile settles it. Bin tossing becomes a throw a bin bends into its opening.
- **Dropping:** let go aimed at the floor at the feet puts the thing down there; no separate drop.
- **Use while holding:** every use (ladders, doors, knobs, buttons) works with something in hand; the rooms' own `useWhileHolding` cases fold into it or stay where holding the thing changes what the use does (a fuse into a holder).
- **Pure parts:** the arc and its bounces, and the choice of action by aim, pure logic in `controls/logic/`, tested; the views only move objects.
- Open: throw range; whether fragile things break; sounds for a throw's bounces (the drop profile's material); what the cue shows for each action (116's glyphs: put down, put in, toss, throw).

## Records

When the design is settled: a plan, `TODO.md`, the controls' guide (`src/toolkit/controls/AGENTS.md`) and the help text in `controls.ts`.
