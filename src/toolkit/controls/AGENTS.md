# Toolkit: controls

How inputs work. This is the one control scheme every room in every game built on the toolkit uses, and the basic simulation mechanics that go with being a person in a room: walking, looking, bumping into things, picking things up and putting them down. `CLAUDE.md` is a symlink to this file; the toolkit as a whole is described in `../README.md` and the game's own guide is the repository's `AGENTS.md`.

## What goes here

- **The input scheme**: what each input does, for keyboard and mouse, trackpad, touch (dual stick) and gamepad, and the help line that follows the last input used. A new thing a player must be able to do is added here, for every input and every room at once, or not at all. No room or component binds a key, button, gesture or stick of its own.
- **Moving the player**: walking, running, looking, zoom, crouch and eye height, and holding the player still while a scene plays.
- **The torch**: the player's own light, held in the right hand as Half-Life's flashlight is, switched on and off by its one control in every room and kept on from room to room, its beam easing after the eye a moment late.
- **The phone**: M and the touch phone icon raise/lower the foreground handset in every room; gamepad D-pad Up raises it. Movement and look continue while the world runs, but world use is held; a carried thing hides until the phone is lowered. Arrow keys, Enter and Escape navigate on keyboard, the D-pad with A and B on gamepad, and taps on the handset's visible icons and keys on touch. Mission 214 adds the main menu and sample inbox; 215 will deliver messages during play.
- **Collision**: walkable footprints, sliding along walls, solid things that cannot be walked through.
- **What a use means**: the click, E, tap or A that uses whatever is aimed at, and knob-turning (a use on a knob's left or right half, or a gamepad's LB and RB, turns it down or up). Components ask which way to turn (`knobDirection`); they never read an input themselves. Every use is also a held input (prompt 091, 2026-10-28): held until the mouse button, E, the pad's A, the touch Use button or a finger held still (`TOUCH_HOLD_DELAY`, after which it uses at once) is let go; a component that repeats while held asks for the use's hold as it is used (`currentUseHold`) and watches it.
- **Carrying**: picking up (eased from where it rests to the hand in about half a second, mission 210), holding, putting down (use on a clear spot of a supportable top: eased there, flat, all of it on the top), letting go (LET GO: Q, the pad's B, touch LET GO, mission 211: carried, it drops; held up to look at, it is thrown; aimed at a bin, either way, it is tossed in; use never lets go: anywhere else it works what is aimed at, the thing kept), dropping, the fall and settling of a dropped object (its drop profile: shape, bounce, friction, roll), and the state of a carried object (installed, held, falling, settled). A component only says that it is portable and how it falls.
- **Perception helpers**: where to put something so it appears without being seen to appear (`hidden-spot`).

## What does not

- Anything a player works or looks at (a button, a meter, a skip): that is a component, in `../components/`.
- What a use does to a particular thing: the component defines that; this layer only delivers the use to it.
- Sounds, and anything about a particular room: rooms are the gallery's or the game's.

## Rules

- This layer imports nothing else of ours (`../layering.test.ts`). The components and the gallery may import it.
- `logic/` is pure logic, no DOM or Three.js, tested beside it. `input/` turns the browser's inputs into those actions and moves the camera.

## Files

- `logic/controls.ts`: the scheme itself, every binding for every input, and the help text.
- `logic/walk-collision.ts`: footprints and sliding collision.
- `logic/drop-profile.ts`, `logic/portable-board.ts`: how carried objects fall, and a carried object's state and events.
- `logic/support-landing.ts`: which support a falling thing lands on: one whose top is at or below its bottom, or one it was let go over with part of itself above the top (mission 181: held low over a desk, it is put on the desk, not dropped through it); never one reached from the side.
- `logic/hidden-spot.ts`: places out of the player's view.
- `input/first-person.ts`: the scheme implemented once, for every room.
- `input/room-controller.ts`: every room starter's entry to that scheme, with a typed room-style slot; `roomControllerOn` lets the main room mount read the controller on its canvas; and, once the game registers the object registry's traits (`useRoomTraits`, from `gallery/views/room-traits.ts`, so this layer still imports nothing of ours), carrying by trait: a thing of a holdable kind may be picked up (its owner, `ownerAllows`, saying whether now), one of a kind that is not may not, a thing of no kind keeps the room's `allowPickup`, and things let go of rest on the derived tops of the room's supportable objects besides the room's own `supports` (missions 189, 181), and the room's solid, bounds-modelled things block the walker and what is thrown besides the room's own `solids` (`RoomTraits.solids`, mission 208). It also installs the information overlay for every room (mission 160): the game registers `useRoomInspector` (`installRoomInspector` in `gallery/views/inspect-pick.ts`), and the factory builds each room's inspector from its own scene, camera and metre plus the room's `world`/`identify` data; a room never passes `inspect` (it is not in `RoomControllerOptions`).
- `input/object-handling.ts`: picking up, carrying, putting down and letting go, with the moves eased and the fall simulated. A placement target marked `letGo` (a bin, mission 209) takes what is let go of at it as well as what is used on it.
- `logic/hand-move.ts`: the hands' half-second eased moves and the all-corners-on-the-top rule (mission 210).
- `logic/throw.ts`: the general throw (mission 211): one speed, a parabola, rebounds off the room's floor-plan solids (the walker's `solids`, passed to the hands as `walls`).
- `input/knob-turning.ts`: which way a use turns a knob, and `markTurnable` for a knob's cue.
- `logic/use-cue.ts`, `input/use-marking.ts`, `input/use-cue-markup.ts`: the crosshair's use cue (prompt 115, `doc/plans/115/push-pull-cue.md`): a component marks what a use on it does (`markUsable`, or a part's `a.cue`: turn, push, pull, or some other way) and whether it will have any consequence now; the controls find the mark by one raycast of the scene a few times a second and draw a turn arrow, a perspective push or pull arrow, or the plain ring, green or red. Anything the room says is aimed at but unmarked gets the plain green ring. The carrying cues (mission 116, `doc/plans/116/pick-up-cues.md`) come from the hands' one resolver, `resolve(x, y)` in `object-handling.ts`, which both the click and the probe use, so they cannot disagree: a lift (green, or red where nothing else takes the click), and while carrying put down on a surface, put back in its own place, put into a bin or carton, or fit into a socket (`PlacementTarget.cue`, or a room's `targetFeedback`, which says what its `heldAction` will do), red with the × where the place refuses; elsewhere the room's own use cue, since use never lets go (LET GO does, mission 211). `handsCue` and `CARRY_GLYPH_SET` (the full set or the simpler one) are in `logic/use-cue.ts`. Asking changes nothing: `allowPickup`, `targetFeedback`, `nearbyTargetFeedback`, a target's `inRange` and `accepts`, and a room's `useWhileHoldingAt` (the query twin of `useWhileHolding`) must be pure; what a pick-up sets off goes in `onPickUp`. While carrying, the help line names the thing and how to turn it over (`carryingHelp`).
- Inspecting what is carried (mission 117): it is held, and turned, about the middle of its bounds, standing for its centre of gravity; holding X (touch's INSPECT, a pad's Y) swings it to the middle of the view at a distance that fits it (`inspect`, `inspectionDistance` in `input/object-handling.ts`), where the wheel brings it nearer or takes it further instead of zooming; as it swings up it turns to show its front (its own +z) with its top (+y) up, so model portables front to +z, upright; turning it by hand stops that. Letting go swings it back to the right hand, keeping how it was turned.
- `logic/use-hold.ts`, `input/use-holding.ts`: a use's hold, from its press until its source is let go, for a component that repeats while held.
- `logic/torch.ts`, `input/torch.ts`: the torch, its beam's lag, and its light in a room's scene.
- `input/touch-sticks.ts`: the on-screen thumbsticks and CROUCH button for touch.
- `logic/menu-navigation.ts`, `input/menu-input.ts`: menus on every input: what keys and pad buttons mean to a menu, spatial focus movement, and the one reader that hands them to whichever menu takes them (mission 096). No menu reads a key or polls a pad of its own.
- `logic/menu-open.ts`: whether a menu panel has the controls, which holds the walker still without pausing the world.
- `logic/phone-open.ts`, `logic/phone-menu.ts`, `input/phone-view.ts`, `input/phone-display.ts`: the shared raised-phone state, menu and inbox, plus the foreground 3D model and its screen texture. The texture uploads only when the visible menu changes.
