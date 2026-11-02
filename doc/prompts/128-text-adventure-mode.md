# 128: Text adventure mode

**Status: research done, not started until the owner says.** Research: [doc/research/text-adventure-mode.md](../research/text-adventure-mode.md).

The owner, 2026-11-02: an entirely alternative way to play. Snap the game into text adventure mode and all the graphics go away; it becomes an early-1980s Infocom-style text adventure. In each place it first says what you sense (hear, smell, feel), then what you see, without every detail; LOOK AT / EXAMINE gives the detail. If everything in the game is addressable, the game can be run as a text adventure, and everything should be interactable that way. Read `CLAUDE.md` and the research first.

## Builds on

Missions 125 (jump the camera to an object by `?look=`), 126 (the dev panel's room list expanding into lookable objects) and 127 (every object indexable, tags on scene objects). Their object index is this mission's list of what is in each place; this mission needs it built from the model in logic (readable without Three.js), with each object's kind and controls. Stage 1 can start before 127 lands by reading the Jacuzzi plant room's model directly; stages 3 onwards wait for 127.

## Goal

A second front-end on the same world and save slot: `?mode=text` (and a pause-menu entry, and a `GRAPHICS` command back), no Three.js loaded, a period terminal with an Infocom status line (location, world time, moves), DOM text with an `aria-live` transcript so a screen reader can play the whole game.

## Stages

1. **One room.** The Jacuzzi plant room (`plant_pool_03`, PL3) in text: room description with senses, LOOK, LISTEN, SMELL, EXAMINE/X, READ for `PL3-CAB1`, `PL3-F1`, `PL3-BT1`, `PL3-DT1`, `PL3-DT2`, `PL3-CAB1-IS1` and its valves; OPEN/CLOSE valves, the cabinet's POWER and RESET, WAIT; noun disambiguation by name, kind and tag. Pure logic in `src/game/text/` (parser, describer, senses), tested with transcript snapshots; a minimal terminal view.
2. **The map.** A pure `locationGraph()` from the plan modules (`main-corridor.ts`, `shell-plan.ts`/`shell-rooms.ts`, `pool-halls.ts`, `pool-loop.ts`, `control-room-mode.ts`, `freight-lift.ts`), compass exits, sub-locations by layout region for the large rooms, checked by a test against the joints the views register (`door-joins.ts`). Movement, doors, mode switching mid-game with position mapped both ways.
3. **Controls as data.** A control registry (id, kind, verbs, the `WorldAction` each dispatches) that the 3D parts and the text mode both read, swept room by room; view-held state (cabinet doors, display pages, knob detents) lifted into the world or a text-mode scene state.
4. **Senses and salience.** Sounds through walls, smells from trichloramine and room air, warmth and humidity, the dark (`lighting.ts`), alarms first, recent events from the log, BRIEF/VERBOSE/SUPERBRIEF.
5. **The whole game.** Museum halls, carried items (the `dose` and `test_kit` stand-ins as TAKE/USE), scenarios, and testing with screen-reader users.

## Rules that apply

- The world stays the one source of truth; text verbs dispatch existing `WorldAction`s, replies come from `describeAction` and the event log.
- No peeking: a description or EXAMINE says only what the thing's own display, lamp or handle shows.
- Names, tags and object descriptions are derived from the model; one short authored flavour line per location is proposed (owner to confirm).
- Input goes through `src/toolkit/controls/` (focus, history, Esc, mode switch); the parser is logic.
- Every component in a text-mode room gets a test that it can be examined, and every control that it can be worked.

## Questions for the owner (one at a time)

1. May each location have one short authored flavour line, outside the derivation rule?
2. Turn-based time (each move a slice, WAIT for more) by default, with real time as an option?
3. Leave dev rooms out of the text map (reachable by `goto` only)?
