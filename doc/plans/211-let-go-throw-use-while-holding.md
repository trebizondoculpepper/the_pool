# 211: LET GO and general throw plan

The settled behaviour is in [the mission brief](../prompts/211-let-go-throw-use-while-holding.md). This plan covers the general projectile and controls while holding. Bin tosses use 209's separate mechanic, and generic surface placement uses 210.

## Coordination

The input mapping, action resolver and pure projectile maths can start now. Integrate bin precedence after 209's targeting API and generic USE placement after 210's placement API. Collision against declared solid bounds waits on mission 208's unfinished solid-bounds stage; use the existing support rule for floors and tops meanwhile. Do not add room-specific collision substitutes.

## Inputs and action selection

In the one control system, add LET GO on keyboard Q, gamepad B during play and the touch LET GO button while an item is held. Move gamepad crouch to right-stick click; keep B as Back in menus. Preserve developer flight's Q camera roll whenever no item is held. Show the LET GO hint while carrying and flash it on pick-up. Desktop mouse-only access is deferred. USE continues to operate ladders, doors, knobs and buttons while an item stays held, and starts 210's placement on a valid top. A targeted bin in ordinary use range takes precedence for both USE and LET GO and invokes 209. LET GO elsewhere releases the item on the aimed trajectory; looking down produces a short drop. Keep existing socket and plug use behaviour, without designing their future traits here.

## General projectile

Give the released item one fixed leisurely launch speed, tuned in the game's rooms rather than charged by input. Advance a parabola under gravity. Reflect from vertical solid bounds with about 20–30% momentum loss per impact; use the existing support rule to land on floors or supportable tops. Keep throws in their current room, with no cross-room transfer or saved loose position. Water can be ignored because no current water room has a holdable item. Do not trigger player hits, loose-item impulses, controls or glass effects. Use one neutral landing sound; material, shape and fragility responses are later work.

## Verification

Test the input mapping and help on keyboard, gamepad and touch; USE while holding; invalid USE retaining the item; bin precedence; LET GO general flight and short downward drop; wall rebound; supportable-top landing; room boundary and room reset. Confirm existing socket and plug interactions remain available. Run the project checks before committing.
