# 128: Text adventure mode

**Status: research done, not started until the owner says.** Research: [doc/research/text-adventure-mode.md](../research/text-adventure-mode.md).

The owner, 2026-11-02: an entirely alternative way to play. Snap the game into text adventure mode and all the graphics go away; it becomes an early-1980s Infocom-style text adventure. In each place it first says what you sense (hear, smell, feel), then what you see, without every detail; LOOK AT / EXAMINE gives the detail. If everything in the game is addressable, the game can be run as a text adventure, and everything should be interactable that way. Read `CLAUDE.md` and the research first.

## Builds on

Missions 125 (jump the camera to an object by `?look=`, done), 126 (the universal catalogue, done) and 127 (every object indexable, tags on scene objects). 126 is done but partial for this mission's purpose: `lookCatalogue()` (`src/toolkit/gallery/logic/look-catalogue.ts`) and `kindCatalogue()` give each room's identities, kinds and parts, but no regions or controls, and leave scene-only objects to 127; treat it as a partial input until its coverage is verified. This mission needs a scene-free model inventory, in logic (readable without Three.js), with each object's kind and controls, checked against 127's scene inventory. Stage 1 can start now by reading the Jacuzzi plant room's model directly. Stage 3 need not wait for 127 as a whole: the catalogue and the Jacuzzi model support a first control registry now, and 127's broader coverage later verifies that the shared data matches the marked scene objects.

## Goal

A second front-end on the same world and save slot: `?mode=text` (and a pause-menu entry, and a `GRAPHICS` command back), no Three.js loaded. `src/main.ts` imports Three.js and the view modules statically (`import { Plane, Vector2, Vector3 } from 'three'`, line 15), so checking `?mode=text` inside it is too late: a separate lightweight bootstrap or entry chooses the mode before importing the graphics entry. The player's place needs its own rule too: the world store holds the simulation, while `src/toolkit/save/game-session.ts` separately saves the last room and 3D pose (`rememberPlayer`, `main.ts` line 189); text mode's location, sub-location and moves need an explicit persistence and conversion rule both ways. The front-end has a period terminal with an Infocom status line (location, world time, moves), DOM text with an `aria-live` transcript so a screen reader can play the whole game.

## Stages

1. **One room, end to end.** A proof of the whole path: boot into text mode, save and restore the position, a visible reading, a world action (one that succeeds and one that fails, checked against the world action and event pipeline, `src/game/events/describe-action.ts`), and a switch to graphics and back, alongside the room's transcript. Say which commands consume time. The Jacuzzi plant room (`plant_pool_03`, PL3) in text: room description with senses, LOOK, LISTEN, SMELL, EXAMINE/X, READ for `PL3-CAB1`, `PL3-F1`, `PL3-BT1`, `PL3-DT1`, `PL3-DT2`, `PL3-CAB1-IS1` and its valves; OPEN/CLOSE valves, the cabinet's POWER and RESET, WAIT; noun disambiguation by name, kind and tag. Pure logic in `src/game/text/` (parser, describer, senses), tested by focused behaviour tests and a few transcript snapshots (broad snapshots of every component would be brittle); a minimal terminal view.
2. **The map.** A pure `locationGraph()` from the plan modules (`main-corridor.ts`, `shell-plan.ts`/`shell-rooms.ts`, `pool-halls.ts`, `pool-loop.ts`, `control-room-mode.ts`, `freight-lift.ts`), compass exits, sub-locations by layout region for the large rooms, built from static plan data, since `door-joins.ts` is a runtime registry that the built views populate, not pure data; a test compares the static graph with the joints the views register. The pool loop, the mode-dependent control room doors and the freight lift's unbuilt floor each need an explicit exit rule. Movement, doors, mode switching mid-game with position mapped both ways.
3. **Controls as data.** A control registry (id, kind, verbs, the `WorldAction` each dispatches; see Shared foundation) that the 3D parts and the text mode both read, swept room by room; view-held state (cabinet doors, display pages, knob detents) lifted into the world or a text-mode scene state.
4. **Senses and salience.** Sounds through walls, smells from trichloramine and room air, warmth and humidity, the dark (`lighting.ts`), alarms first, recent events from the log, BRIEF/VERBOSE/SUPERBRIEF.
5. **The whole game.** Museum halls, carried items (the `dose` and `test_kit` stand-ins as TAKE/USE), scenarios, and testing with screen-reader users.

## Rules that apply

- The world stays the one source of truth; text verbs dispatch existing `WorldAction`s, replies come from `describeAction` and the event log.
- No peeking: a description or EXAMINE says only what the thing's own display, lamp or handle shows. The observable-reading boundary is shared with inspection: text uses the same lamp, display and handle readings the overlay uses, with visibility and darkness applied before narration. Some world helpers mix observable state with view-held state (`jacuzziCabinetPanel` in `src/game/world.ts` takes the view's door state), so the boundary must be explicit. Mission 124's black viewscreen is a rendering fault, never a text-mode reading.
- Names, tags and object descriptions are derived from the model; one short authored flavour line per location is proposed (owner to confirm).
- Input goes through `src/toolkit/controls/` (focus, history, Esc, mode switch); the parser is logic.
- Every component in a text-mode room gets a test that it can be examined, and every control that it can be worked. Coverage checks report catalogue entries with no text description, controls with no text verb, and text nouns that resolve to no object.

## Shared foundation

This mission's control registry is the same data 129 needs for "controlled by" and 130 needs for its magic-room presets. One shared kind/part/control/view-state descriptor (control ids, the world action each drives, visible readings, state presets) should serve all three, and 127's named parts. Its shape and ownership are to be settled with the owner, not invented separately here.

## Open questions for the owner (one at a time)

1. Should each location have one short authored flavour line, outside the derivation rule, or only model-derived prose?
2. Should text mode advance time by turns, in real time, or offer both?
3. Should development rooms appear on the ordinary text map, or be reachable only by a developer command such as `goto`?
4. The shape of the shared kind/part/control/view-state descriptor (see Shared foundation), and which mission builds it first.
