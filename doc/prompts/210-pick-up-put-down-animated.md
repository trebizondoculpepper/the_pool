# 210: Picking up and putting down, animated

The owner, 2026-11-05: "When objects are picked up or placed, that should be animated." Split from the let-go discussion on the owner's word (2026-11-05): this mission is the two animations; letting go, throwing, dropping and using while holding are [211](211-let-go-throw-use-while-holding.md). **A discussion brief, not for implementation yet:** the design is settled with the owner one question at a time, with `nicole_buruaah`. Everywhere at once, in the one control scheme (`src/toolkit/controls/`), per the rule that new behaviour goes into the game's systems, never a special case. Builds on missions 116 and 117 (the carrying cues and inspecting) and 181 and 189 (supportable and holdable).

## The owner's request

- **Picking up:** the object moves from its resting place to the held position, with an animation that eases in and out.
- **Placing:** if put down on a surface, the reverse of picking up.

## Today (checked 2026-11-05)

- Picking up: the thing goes straight into the hand's frame and is pulled the rest of the way by an exponential smoothing (`held.grab.lerp(…, dt * 12)` in `controls/input/object-handling.ts`): it eases out, not in, and has no set duration. Inspecting (117) swings it to the middle of the view the same way.
- Putting down: aimed at a place that takes it (its home slot, a socket, a carton), it snaps in at once; otherwise it falls from the hand by its drop profile onto the floor or a supportable top (`logic/support-landing.ts`). Nothing is placed with a move of its own.

## Proposed, still to settle (one question at a time)

- **Picking up:** an eased (in and out) move of about 0.3 s from where the thing rests to the hand, position and turn together, by one pure tween (`controls/logic/`, tested); while it moves it cannot be let go of or inspected.
- **Putting down:** the same move reversed, from the hand to where it will rest (a place that takes it, or a supportable surface aimed at within reach), ending flat on it; what decides that it is put down rather than dropped or thrown is 211's.
- **Interrupted:** what happens if the walker moves or turns during the move (the target follows the hand, so it never lags off screen).
- **The same for every portable** in every room, the rooms' own snaps (put-back, sockets, the carton) included.
- Open: the duration (fixed, or by distance), an arc over things in the way, and a sound at the start and end (the drop profile's material).

## Records

When the design is settled: a plan, `TODO.md`, the controls' guide (`src/toolkit/controls/AGENTS.md`).
