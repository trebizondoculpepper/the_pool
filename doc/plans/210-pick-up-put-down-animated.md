# 210: Animated pick-up and put-down plan

The settled behaviour is in [the mission brief](../prompts/210-pick-up-put-down-animated.md). This mission covers held `holdable` items and generic surface placement. Bin tosses are 209; general throws and LET GO are 211; socket, plug, rackable and stackable placement are later trait work.

## Shared animation

Add one pure, time-based eased move in `src/toolkit/controls/logic/` for position and orientation. Pick-up moves directly from the object's world pose to the moving hand over about 0.5 s. Generic put-down moves directly from the held pose to a world-fixed destination chosen when USE begins, also over about 0.5 s. The move completes if the walker turns or walks and does not avoid intervening geometry. Inputs affecting the moving item wait for its short move to finish. Pick-up and put-down are silent.

## Generic placement

USE on a clear, aimed point of a valid supportable top starts placement. Do not search for a nearby spot. A desk placement requires all four bottom corners of the item's flat final footprint inside the support's upper surface, with no overhang or overlap. Invalid USE leaves the item held and uses the existing impossible-action cue. Walls and floors are not deliberate placement targets; LET GO handles floor drops through 211. A shelf replacement requires the future `rackable` trait, and placement atop a loose item requires the future `stackable` trait. Preserve current dedicated socket and plug behaviour until those traits are designed.

## Verification

Test easing endpoints and timing, a moving walker during pick-up, a fixed destination during placement, an invalid or occupied top, all-four-corner fit, and no obstacle routing. Confirm luggable objects are excluded and existing dedicated target behaviour remains intact. Run the project checks before committing.
