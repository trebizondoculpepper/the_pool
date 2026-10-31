# 117: Inspect a carried object at the centre of the view

Research and proposal, 2026-10-31. The owner wants a carried object to be easy to turn and zoom for close inspection, without losing the ordinary impression that it is held in the walker's right hand. This is a proposed object-handling mission, not an implemented mechanic.

## What already works

The shared controls already use hold X and mouse movement to turn a carried object; touch uses INSPECT and drag or the right stick, and a gamepad uses hold Y and the right stick (`src/toolkit/controls/logic/controls.ts`, `input/first-person.ts`). `createObjectHandling` eases the grab point toward camera-local `(0.18, -0.18, -0.65)` metres, which leaves the object low and right of the crosshair. The wheel, pinch and gamepad triggers currently change the camera's field of view, whether or not an object is held. Narrowing that view can put a carried object outside the frame. X therefore needs an inspection _pose_ and a useful close-view control; it does not need a second rotation binding.

## Precedents

- [Amnesia: A Machine for Pigs' manual](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/239200/manuals/Manual.pdf?t=1727954562) describes holding R and moving the mouse to rotate a grabbed object, and using the wheel to move it closer or farther away. [Frictional's account of The Dark Descent's physics](https://frictionalgames.com/2010-09-lets-not-forget-about-physics/) describes direct manipulation of grabbed objects. Together these are the closest first-person precedents for the mechanic here.
- [Resident Evil's original manual](https://secure.cdn.us.playstation.com/manuals/classic/games/resident-evil-directors-cut-manual-en.pdf) gives Check its own 3D item view, with rotation and magnification controls. [Resident Evil 0's manual](https://game.capcom.com/manual/bio0/assets/images/pdf/RE0_HD_SWITCH_en.pdf) likewise puts the examined item in a dedicated window with rotation and zoom. These solve legibility by bringing the item to the player's attention rather than steering the world camera toward a hand; their separate inventory screen is more of a break from this game's walk-and-carry interaction.

## Proposed behaviour

Keep the current right-hand carry pose. While X is held, ease the carried object's visual centre in front of the crosshair, at a comfortable distance. Mouse movement continues to rotate the _object_, leaving camera yaw and pitch unchanged. While inspecting, the wheel changes the object's inspection distance within bounds chosen from its actual dimensions and the camera's field of view; outside inspection, the wheel retains its present optical zoom. Letting go of X eases the object back to its right-hand carry pose while keeping the rotation the player gave it. Releasing or placing the object cancels inspection immediately. The same state and transitions should apply to the existing touch INSPECT and gamepad Y bindings, with their existing rotation controls and a clear distance control or an explicitly documented fixed inspection distance on those devices.

The inspection centre should be based on the object's bounds, not its pivot or original grab point: software boxes, a fuse and an irregular skimmer find should each occupy the centre. Fit the full bounds inside a safe portion of the viewport at the default distance, allow a closer view without clipping the near plane, and prevent intersection with the walker's coarse carry solids. If an obstacle prevents the centred pose, stop at the nearest valid pose; do not move the world camera. The object remains the same portable object in the scene, with its existing state, placement and drop behaviour. While inspection is active, suppress placement cues and actions that would misleadingly target through the centred model; restore them on release.

Turning, whether inspecting or not, is about the object's approximate centre of gravity (the centre of its bounds will do), never its pivot: a software box's origin is at a corner, so today it swings round that corner when turned with X held (the owner, 2026-10-31).

A held object is drawn over the world, as a first-person game draws the hands and what they hold, so it never clips through a wall, shelf or desk it is carried against (the owner, 2026-10-31): drawn last, its depth test against the world off or cleared, while the carry solids still keep it physically clear.

## Why this approach

Moving only the object follows the Amnesia-style direct-manipulation precedent and the existing X rotation behaviour. Tilting the camera down and right would move the world, crosshair and aiming ray; keeping attention at screen centre would then need a second target convention, and a sudden camera motion could feel like the player has lost control of their view. This is an inference from the current camera, targeting and carry code, not a claim that no game uses a camera tilt. A brief, reversible object motion is the simpler first prototype. The dedicated Resident Evil view is a useful fallback if readable labels and small parts still cannot be framed well in the world.

## Implementation outline

1. Prototype in dev0 with a small item and a large box; use the shared `src/toolkit/controls/` state, not a room-specific key listener. Preserve the present X/Y/touch bindings and rotation.
2. Add a pure framing calculation for bounds, camera field of view, aspect ratio and a bounded distance; test extremes and viewport changes. Let `object-handling.ts` apply and ease the inspection pose while retaining the real object's transform and existing carry-solid checks.
3. Route wheel zoom to inspection distance only while inspecting; decide and implement equivalent touch/gamepad distance control in the shared scheme. Update the carrying help to explain rotate and distance.
4. Try pick-up, inspect, zoom, release, place, drop, room transition and menu/console interruption in dev0, the engineer's software boxes and Hall 5's skimmer finds. Check narrow displays and a gamepad as well as mouse.

## Acceptance

- Holding X brings the entire held object into a useful central view; releasing X returns it smoothly to the carry pose without changing the walker's camera direction, position or the object's new rotation.
- Mouse movement rotates the object while X is held; the inspection distance can be adjusted without letting the object disappear outside the frame or pass through the near plane.
- The same inspect state works through the shared touch and gamepad bindings; menus, loss of focus, placing and dropping cannot leave a stuck inspection pose.
- Existing pick-up, placement, drop, collision and crosshair behaviour still works when inspection is inactive; large and small objects are framed sensibly.

## Owner decision

Try the centred-object pose first. If it feels too much like an inventory overlay when played, compare a small camera tilt in dev0 before committing to that alternative; keep camera movement out of the first implementation.
