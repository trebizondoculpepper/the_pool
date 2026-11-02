# Text adventure mode: how possible is it?

Research for mission 128 ([brief](../prompts/128-text-adventure-mode.md)), 2026-11-02. No game code was changed.

## The idea

The owner, 2026-11-02: a "text adventure mode", an entirely alternative way to play. Snap the game into it and all the graphics go away; it becomes an early-1980s Infocom-style text adventure. In a room it first describes what you sense, then what you see ("You're standing in the serene main Olympic pool hall of Tadfield Leisure Centre... Your nose is irritated with a sense of chlorine."). A very large room may be subdivided. In a smaller room (the Jacuzzi's plant room, say) it says what you hear, smell, feel and see, but not everything in detail ("a light on an annunciator is flashing and bleeping"): you must LOOK AT ANNUNCIATOR for the detail. The point: if everything in the game is addressable, the game can be run as a text adventure, and everything should be interactable that way.

## Verdict in one paragraph

Feasible, and more than half the foundation is already in the code, because the project's rules have been pushing towards it for weeks: one pure world state (`src/game/world.ts`) changed only by typed actions, a console that already reads and drives it in text (`src/toolkit/console/logic/commands.ts`), an exhaustive narrator for every action (`src/game/events/describe-action.ts`), an event log, algorithmic tags, names and descriptions (`model-valves.ts`, `installed-asset-ids.ts`, `component-descriptions.ts`), and an inspection rule ("no peeking") that is exactly what EXAMINE should say. What is missing is (a) a static map of locations and exits (the room graph is today assembled at run time by the rooms' views), (b) a per-room list of what is in it, from the model, with each thing's verbs, (c) the minority of interactions and display state that still live in view code, (d) senses and salience, and (e) the parser and the terminal screen. A one-room, playable proof is a few days' work; the whole game is a long mission, mostly in lifting the remaining view-only behaviour into logic, which the project wants anyway.

## 1. The world and the model: what is reachable without the 3D scene

### Ready

- **One world state.** `World` (`src/game/world.ts:388`) holds everything that persists: plant services, pools, water treatment, dosing pumps, the Aqualis Trios, CO₂, chemicals, distribution, lighting, gas detection, air handling, the Jacuzzi and its cabinet, installed valve positions (`installedValves`, keyed by asset id), weather and more. `stepWorld(world, delta)` (`world.ts:1450`) and `advance()` (`world.ts:2282`, fixed `STEP = 0.1` s) run it with no DOM or Three.js; `src/game/` is pure by rule and tested headless.
- **Actions.** `WorldAction` (`world.ts:604`) has about 72 variants, applied by `applyAction` (`world.ts:766`): valves (`plant/valve`), switches (`plant/switch`), isolators, feeders, lighting board ways, the boiler house, the Jacuzzi (`jacuzzi`, `jacuzzi/cabinet` with `power` and `reset`), the Aqualis, dosing pumps, the chemical control box, gas zones, the fire alarm and so on. Whatever a text verb does must end as one of these; that is already how the 3D game works.
- **Narration of actions.** `describeAction` (`src/game/events/describe-action.ts`) gives every action a logbook line ("no change" when nothing changed); its switch is exhaustive, so a new action without a line does not compile. That is the text adventure's reply to a verb, nearly for free ("PL3-CAB1-IS1 switched off." becomes "You pull the switch-fuse's handle down. Click. The cabinet's display goes dark.").
- **The event log.** `GameEvent` (`src/game/events/game-event.ts`: time, kind, severity info/notice/alarm, subject tag, text, by) with watchers (`watchers.ts`, `pump-events.ts`, `valve-events.ts`, `alarm-events.ts`) that notice plant changes, trips and alarms on their own. That is the "Meanwhile..." channel: "Somewhere to the east a pump stops." and the source of salience ("changed recently").
- **Names, tags and descriptions, derived.** Valves and isolators of every modelled room come from the schematic and the plumber's expansion (`src/game/plant/model-valves.ts`, `MODEL_VALVES`); machines from `installed-asset-ids.ts`, `installed-fixtures.ts` (with `purpose`), `installed-feeders.ts`, `identification.ts`; prose from `component-descriptions.ts` ("Isolates water flowing from X to Y.", "Nth <type> in <room>, currently <status>"), headings and state from `component-inspection.ts`, `component-status.ts`, `part-inspection.ts` (`describePart`), `equipment-kinds.ts` (per-kind `StatusPolicy`), `equipment-catalogue.ts` (the inventory, `plantInventory`). These are the nouns, their adjectives and their EXAMINE text.
- **Panels computed in logic.** Many boards' displays are already pure functions of the world. The Jacuzzi's cabinet is the model case: `jacuzziCabinetPanel(world)` (`world.ts:2180`) returns its lamps (`supplied`, `pumpRun`, `flowing`, `uv`, `dosing`, `noFlow`), its two-line LCD and its message list (`TRIP: NO FLOW`, `CHECK VALVES+RST`, `TRIP: TANK LOW`, `NO HEAT`, `TEMP LOW`, `DRAINING`, `RUNNING  UV ON`, `TANK 22%`, from `jacuzzi-cabinet.ts`). Likewise `jacuzziPlate`, the location annunciators (`location-annunciators.ts`: `sense(world)` per window, `acceptLocationAlarms`, `resetLocationAlarms`), the Aqualis annunciators, CO₂ status, `plantReadingOf` (`world-reading.ts`, cached per world object), the mimic logic modules (`jacuzzi-mimic.ts`, `air-mimic.ts`, `pool-mimics.ts`, `wet-hall-mimic.ts` and others in `src/toolkit/gallery/logic/`) and `bridge-pages.ts`.
- **The console is already a text interface.** `commands.ts` has `status`, `rooms`, `room`, `goto`, `valves`, `switches`, `switch`, `motors`, `starter`, `chemicals`, `dose`, `doses`, `dilute`, `test_kit`, `weather`, `co2`, `get <path>` (reads any world path) and `act <json>` (any world action, checked by `checkedAction`), plus `log`. A text adventure is, in effect, this console with a friendlier grammar, a sense of place and a narrator.

### Not yet reachable without the scene

- **Interactions bound in views.** About 62 view modules under `src/toolkit/` declare part uses, and about 24 dispatch to the world directly. Most dispatch an existing `WorldAction`, so the text verb can dispatch the same action; but the mapping "this button on this panel is this action" lives in the view, not in data. It needs to become data (a control's id, its kind, its verbs and the action each verb dispatches) that both front-ends read.
- **View-held state.** Some state the panels show is not in the world: the Jacuzzi cabinet's door is passed in by its view (`jacuzziCabinetPanel(world, doorOpen)`; the UV lamp goes out when the door is open), doors' angles and the self-closing plant doors are view state (`door-joins.ts`, `Joint.open()`, `angle()`), and some knobs' detents, a display's current page and the like are held by their parts. For text, either lift each into the world (if it should persist) or keep a small per-mode "local scene state" beside the world (a door you have propped open).
- **`part.shows()` status strings.** Where a part's inspection text is composed in its view, it must move to a pure function the text mode can call. The inspection system (`src/toolkit/controls/logic/inspection.ts`, `component-inspection.ts`) has mostly done this; a sweep is needed to find the rest.
- **Rooms not yet migrated to the enhanced network.** CLAUDE.md notes rooms still drawn by hand (`doc/prompts/done/063-component-information-remediation.md`); their contents are not yet enumerable from the model. Text mode would show these gaps immediately, which is useful pressure.

## 2. Space: locations and exits

- `src/game/facility-plan.ts`, named in CLAUDE.md, no longer exists (removed in `b0cef396`, "Restart the plant rooms and grow the rooms round PR_A"); CLAUDE.md is stale on this point. The plan is now spread across: `main-corridor.ts` (`CORRIDOR_DOORS`: each door's wall, position and the room beyond: `plant_pool_02` and `engineers_office` north, `air_plant` and `control_room` east, `plant_pool_01`, `boiler_house`, `switch_room` south, `loading_bay`, `plant_pool_04`, `plant_pool_03` west, `wet_hall` twice on the inner walls; the freight lift's B2 landing `CORRIDOR_LIFT`), `shell-rooms.ts` and `shell-plan.ts` (each plant room's `ShellPlan` with `ShellDoorway { wall, at, width }`), `plant-rooms.ts`, `pool-halls.ts` (each hall's `plantDoor`), `pool-loop.ts` (`LOOP_LEGS`, the endless pool loop), `museum-plan.ts`, `freight-lift.ts`, `dev-room-links.ts` (`RoomId`, `ROOM_ALIASES`, dev room numbers) and `control-room-mode.ts`.
- **The live room graph is built at run time** by the rooms' views calling `registerJoint(room, to, joint)` (`door-joins.ts`), so it cannot be read without building the scene. But every joint is derived from static plan data, so a pure `locationGraph()` can be written from the modules above: a node per room (or sub-location), an edge per doorway, with its compass direction taken from the wall (`north`/`south`/`east`/`west`; corridor walls `inner-east` etc. inverted), UP/DOWN from stairs (`ShellStair.heading`, `stair-run.ts`) and the lift's floors. A test can then check it against the joints the views register, so the two never drift.
- **Compass convention.** Plans use x east, z south (`shell-plan.ts`), so wall names translate straight into exits. Doors are entered from the corridor side, so "the Jacuzzi plant room is west of the corridor's west arm".
- **The pool loop** is deliberately non-Euclidean: each leg leaves a hall by its north wall and enters the next by its south, through a corridor of a straight, a random turn or flight of stairs, and another straight (`legPieces(seed)`). In text that is a gift: "You follow the corridor. It turns left, then climbs a short flight of stairs... You are in the Lounge pool hall." Going north from every hall forever is a classic text-adventure maze joke that is true to the game.
- **The control room mode knob** (`control-room-mode.ts`, `World.controlRoomMode`) is a world value, so EAST from the corridor's control room door goes to `control_room` or `bridge` according to it, exactly as in 3D: TURN KNOB TO NEW.
- **Doors.** Plant doors (`plant-door.ts`) are FD60 self-closing doors with signs and a card reader "seen, not worked": in text, GO WEST opens and passes through; the signs are readable (READ SIGN: "PLANT ROOM. Authorised Personnel Only."); the self-closer is a line ("The door sighs shut behind you."). No door state needs keeping unless a puzzle wants it.
- **Subdividing big rooms.** The layout regions (`room-regions.ts`, `doc/room-layout-guide.md`: the sizer's regions and blocks per plant room) are natural sub-locations: "Olympic plant room, filter battery", "...pump set", "...dosing bay". Pool halls split into deck sides, the shallow and deep ends, the viewing gallery (`pool_02_gallery`). Sub-locations within one room need no doors: NORTH moves between regions, and anything in the same room is audible from every region (but only visible in detail from its own). Museum halls split by exhibit (`museum-*-layout.ts`).
- **Dev rooms** should be left out of the text map by default (reachable with the console's `goto`), as they are test benches, not the leisure centre.

## 3. Senses: what drives HEAR, SMELL, FEEL and the dark

| Sense                      | Existing state                                                                                                                                                                                                                                             | Text                                                                                                                               |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Hear: pumps, fans, boilers | motor starters (`motor-starters.ts`, `MOTORS`, `world.motors`), `circulating()`, air handling fans (`air-handling.ts`), boiler house (`boiler-house`, sequencer, burners)                                                                                  | "the steady hum of the circulation pump", "a boiler's burner roars into life"                                                      |
| Hear: alarms               | annunciators' unaccepted windows (`location-annunciators.ts`, Aqualis and CO₂ annunciators), `alarm-bleep.ts`, gas detectors (`room-air.ts`, `AlarmState` clear/low/high), fire alarm                                                                      | "an annunciator is bleeping" until ACCEPT; sounders heard through walls                                                            |
| Hear: water                | `jacuzziDischarging`, `jacuzziTankDraining` (the owner: gurgling into its tundish), make-up filling, `pool-flow.ts`, Jacuzzi jets and air (`jacuzziRuns`)                                                                                                  | "water gurgles into a tundish"                                                                                                     |
| Hear: music                | `music.ts`, `jacuzzi-music.ts`                                                                                                                                                                                                                             | "tinny music leaks from the Jacuzzi hall"                                                                                          |
| Smell                      | trichloramine and combined chlorine (`pool-chemistry.ts`, `combinedChlorine = chloramine + organicChloramine + trichloramine`), chlorine and ozone in room air (`room-air.ts`, `toPpm`), hypochlorite and acid stores, CO₂ (no smell: say so, dangerously) | halls smell of "chlorine" in proportion to trichloramine, not free chlorine, which is the real chemistry and a nice teaching point |
| Feel                       | hall air temperature and humidity (`air-handling.ts`), water temperature (`pools`), `ambient` and weather, boiler house heat (`heat-loss.ts`, `thermal.ts`)                                                                                                | "the air is warm and close", "the deck is cold underfoot"                                                                          |
| See: light                 | `roomLightsOn`, `zoneLit` (`lighting.ts`), emergency lighting on the central battery, `torch.ts`                                                                                                                                                           | "It is pitch dark. You are likely to be eaten by..." (no: it is a plant room) "...you can hear a pump but see nothing."            |

Every row reads existing world state; none needs new simulation. What is needed is a pure `senses(world, location)` that gathers these into ranked "impressions", and a rule for what carries through walls (alarms and loud machines to the neighbouring locations, as the audio already does with `jacuzziApproachGain`).

## 4. Salience: what a room description mentions

Infocom's shape: the location's name as a heading; one or two lines of description; then "You can see..." for objects worth noticing. Here:

1. **Senses first** (the owner's order): the loudest sound, the strongest smell, how the air feels, if notable.
2. **Then the room's authored flavour line**, one short line per location.
3. **Then the salient things**, ranked: an alarm sounding or a lamp flashing; a trip; anything changed in the last few minutes (`recentEvents` from the log); machines running or stopped against their normal state (the schematic's `normally`); the rest summarised by kind ("Nineteen valves stud the pipework", "two day tanks, white and blue").
4. **Everything else only on EXAMINE.** The "no peeking" rule binds: a description and EXAMINE say only what the thing's own display, lamp, flag or handle position shows. "The pump is running" only if a lamp or a sound says so; an unmonitored valve's position only from its handle when you look at it.
5. **BRIEF, VERBOSE, SUPERBRIEF** as Infocom had them: full description on first visit, then the heading and only what has changed.

## 5. Parser

- **Verbs.** LOOK/L, EXAMINE/X/LOOK AT, READ (gauges, displays, signs, labels), GO/N/S/E/W/NE.../UP/DOWN/IN/OUT, OPEN/CLOSE/SHUT (valves, doors, cabinet doors), TURN <knob> TO <position>, TURN <valve> (quarter-turn), SET <setpoint> TO <n>, PRESS/PUSH <button>, START/STOP <pump>, SWITCH ON/OFF, ACCEPT, RESET, SILENCE, TAKE/DROP/INVENTORY/I (test kit, dose bottles, keys, a torch), WAIT/Z and WAIT <n> MINUTES (calls `advance`), LISTEN, SMELL, TOUCH/FEEL, AGAIN/G, UNDO (cheap: the world is immutable), SAVE/RESTORE (the existing slots), BRIEF/VERBOSE, HELP, plus the console's commands behind a prefix.
- **Nouns.** Resolved against the location's objects: tag (`PL3-CAB1-IV5` exactly), derived name ("heating flow valve"), kind ("valve", "cabinet", "tank"), adjectives from the name's words and live state ("open valve", "flashing lamp", "red button"), the maker's brand ("Lidoluxe tank"). Scope is the location, then the room, then carried things.
- **Disambiguation.** When several match: "Which do you mean, the heating flow valve or the heating return valve?", answered with a fragment ("return"), as Infocom did. Tags always disambiguate. With nineteen valves in PL3 this matters from day one.
- **Library or bespoke.** JavaScript IF libraries (Inform 7 compiled to Glulx with Quixe, ink, Twine, `compromise` for NLP) all want to own the world model or the story, which here belongs to `World`. Recommendation: a small bespoke parser in `src/game/text/` (pure, tested): tokenise, strip articles, match a verb table with patterns (`TURN obj TO word`, `PUT obj IN obj`), resolve nouns by scored matching over each object's name words, kind, tag and adjectives, and ask when ambiguous. Perhaps 400 to 600 lines with tests; no dependency, and its grammar is data that mirrors the component kinds.

## 6. Architecture

- **Headless world.** Yes: the world runs without the renderer (every `src/game` test does), and `world-store.ts` (`worldStore(slot)`, `roomWorld()`) holds it and its events. Text mode is a second front-end on the same store, reading and dispatching like the console's `host.world()` and `host.dispatch()`.
- **Boot.** `src/main.ts` (2,270 lines) boots the title screen, settings, the renderer, room modules (`room-module-cache.ts`), the console, audio and the session (`game-session.ts`). Text mode should be a separate entry that does not import Three.js at all: `?mode=text` (a URL parameter, like `?room=`) checked first in `main.ts`, dynamically importing `src/text/main-text.ts`, so neither mode pays for the other. A pause-menu entry ("Play as text") reloads with the parameter; a TEXT command `GRAPHICS` goes back. Both share the save slot, so you can switch mid-game: the world carries over; the player's place maps from 3D position to location (room id, region by position) and back (a location's arrival point, as `corridorArrival` does).
- **Time.** In real time the world runs on; in text the usual choice is turn-based, each move a fixed slice (say 10 s), WAIT for longer, with a "real time" option for those who want the alarms to keep coming. Turn-based suits screen readers best.
- **Screen.** A period terminal: an Infocom status line (location on the left, world time from `worldClock` and moves on the right, in place of score), amber or green on black in a monospace face, a scrolling transcript, the prompt `>`. Rendered as plain DOM text (no canvas), which keeps it accessible.
- **Accessibility.** The large upside: as DOM text with an `aria-live` region for new output, the whole game becomes playable with a screen reader, which the 3D game can never be. This is reason enough on its own.
- **Input and the controls rule.** CLAUDE.md requires all input to go through `src/toolkit/controls/`. Typed text is not a key binding, but the rule should be honoured: the text field's focus, history (up/down), Esc to the menu, and the mode switch go through the control scheme as the console's input already does (`console-open.ts`); the parser itself is logic, not input. Touch devices get the on-screen keyboard plus a row of quick verbs (LOOK, N, S, E, W, WAIT).

## 7. Writing without writing everything

- **Objects:** templates per component kind (`equipment-kinds.ts`), filled from the model: name, maker (`brands.ts`), purpose (`installed-fixtures.ts`, `component-descriptions.ts`), and state phrases from what its own display shows. "A Lidoluxe balance tank (PL3-BT1). It takes the spa's overflow and holds the water the bathers and jets displace. Its sight glass shows it about a fifth full." One template per kind covers every instance in the building.
- **State phrases:** small tables per kind and state: a valve's handle "in line with the pipe (open)" or "across it (shut)"; a lamp "lit", "dark", "flashing"; a pump "humming", "silent"; a gauge "reads 1.2 bar".
- **Room flavour:** one authored line per location (about forty in the leisure centre itself, plus museum halls), which does not break the derivation rule: that rule is about tags, names and descriptions of the model's components, and a room's atmosphere is not a component. Worth confirming with the owner (question 1 in the brief).
- **Tone:** for adults; dry, British, understated, a little weary, as a long-serving duty engineer would narrate it; never twee. Infocom's wit without its fantasy: "The Footbath plant room. It is small, warm and smells faintly of feet, which is to say of trichloramine."

## 8. A mocked transcript: the Jacuzzi plant room

Real ids and tags: room `plant_pool_03` ("Jacuzzi plant room", code PL3), entered by the main corridor's west wall (`CORRIDOR_DOORS`, `at: 23.95`); `PL3-CAB1` the packaged Jacuzzi plant cabinet, `PL3-F1` its sand filter, `PL3-BT1` its Lidoluxe balance tank, `PL3-DT1` and `PL3-DT2` the hypochlorite and acid day tanks, `PL3-SF1` the room's feeder, valves `PL3-CAB1-IV1` to `IV11`, `PL3-CAB1-DV1`, `PL3-BT1-IV1` (make-up), `PL3-BT1-DV1` (tank drain), `PL3-CAB1-IS1` (the cabinet's switch-fuse isolator); cabinet actions `power` and `reset`, messages from `jacuzziCabinetDisplay`. A new game's panel reads `37.0C  SET 37.0` / `RUNNING  UV ON`, messages `RUNNING  UV ON`, `TANK 22%`. Note the Jacuzzi has no annunciator: its alarm is the cabinet's NO FLOW lamp and display. Here someone has shut the make-up valve, the tank has run down and the pump has tripped.

```
Main corridor, west arm
>WEST
You push through the fire door. It sighs shut behind you.

Jacuzzi plant room                                    14:32   Moves: 41
It is warm in here, and quiet: too quiet, for a room whose whole job is
to hum. A sharp chemical tang hangs over the day tanks. A red lamp is
lit on the plant cabinet against the far wall.
You can see a Lidoluxe balance tank, a sand filter, two day tanks (one
white, one blue), a wall-mounted switch-fuse and a good deal of valved
pipework.

>LISTEN
No pump runs. Somewhere behind the cabinet a ball valve ticks as it
cools. From the hall next door, faintly, comes the sound of a Jacuzzi
not bubbling and somebody complaining about it.

>EXAMINE CABINET
The packaged Jacuzzi plant cabinet (PL3-CAB1) does the spa's pumping,
filtering, heating, UV and dosing in one grey steel box. Its door is
shut. On its fascia: a POWER switch (on), a RESET button, lamps for
SUPPLY (lit), PUMP RUN (dark), FLOW (dark) and NO FLOW (lit, red), and
a two-line display.

>READ DISPLAY
The display reads:
  TRIP: TANK LOW
  37.0C  SET 37.0

>PRESS RESET
You press RESET. Nothing happens. The display still reads TRIP: TANK
LOW.

>EXAMINE TANK
The Jacuzzi balance tank (PL3-BT1), by Lidoluxe, takes the spa's
overflow and holds the water the bathers and jets displace, for the
circulation pump to draw from. Its sight glass is all but empty.

>EXAMINE VALVE
Which do you mean: the make-up to the balance tank valve, the balance
tank drain to waste valve, or one of the cabinet's eleven valves?

>MAKE-UP
The make-up to the balance tank valve (PL3-BT1-IV1) is a lever valve.
Its handle lies across the pipe: it is shut.

>OPEN PL3-BT1-IV1
You swing the handle in line with the pipe. Water hisses into the
balance tank.

>WAIT 10 MINUTES
Time passes. The hiss settles to a trickle. With a clunk, the
circulation pump starts; the NO FLOW lamp goes out and FLOW lights.

>LOOK
Jacuzzi plant room
It is warm in here, and the cabinet hums contentedly. A sharp chemical
tang hangs over the day tanks.
The make-up valve, which you opened, is open.
You can see a Lidoluxe balance tank, a sand filter, two day tanks, a
switch-fuse and a good deal of valved pipework.
```

The TANK LOW trip clearing itself as the tank recovers, and RESET doing nothing to it (RESET clears only a NO FLOW trip, once there is a way through), are both the cabinet's real behaviour (`jacuzzi-cabinet.ts`). For an annunciator ACCEPT, the Lounge or Olympic plant rooms or the wet hall have one (`location-annunciators.ts`): "An annunciator is bleeping; one window flashes." / LOOK AT ANNUNCIATOR / PRESS ACCEPT: "The bleeping stops. The window burns steady." (its engraving read from that board's `*_ALARM_TEXT`).

## 9. Gaps and effort

| Area                      | Exists                                                      | To build                                                      | Size                              |
| ------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------- |
| World, actions, time      | `World`, `applyAction`, `advance`, stores                   | nothing                                                       | none                              |
| Narration of actions      | `describeAction`, event log, watchers                       | a "you" voice over the logbook voice                          | small                             |
| Names, tags, prose        | model valves, asset ids, fixtures, descriptions, inspection | per-kind templates and state phrases                          | medium                            |
| Room contents             | per-room registries scattered                               | `contentsOf(location)` from the model (needs 125-127's index) | medium                            |
| Controls as data          | actions exist; bindings in views                            | a control registry: id, kind, verbs, action                   | large (sweep of ~62 view modules) |
| View-held state           | doors, cabinet doors, pages, some knobs                     | lift to world or a text-mode scene state                      | medium                            |
| Map                       | static plan data, run-time joints                           | pure `locationGraph()`, regions, test against joints          | medium                            |
| Senses, salience          | all the state                                               | `senses()`, ranking, brief/verbose                            | medium                            |
| Parser                    | console tokeniser                                           | bespoke parser and disambiguation                             | medium                            |
| Screen, mode switch, a11y | console view                                                | text front-end, `?mode=text`, status line                     | small to medium                   |

### Staging

1. **One room, read-mostly:** the Jacuzzi plant room in text, behind `?mode=text&room=plant_pool_03`: description, LISTEN, SMELL, EXAMINE, READ for its cabinet, tank, filter, day tanks and valves; OPEN/CLOSE valves, POWER, RESET, WAIT. Proves the whole stack on the smallest real room with real faults. About a week.
2. **The map:** `locationGraph()` for the leisure centre (corridor, plant rooms, halls, pool loop, control room and bridge by the knob), movement, doors, the status line, save-slot sharing and switching modes.
3. **Controls lifted into logic:** the control registry, swept room by room; every panel, mimic and annunciator operable by text; view-held state lifted. The long stage; each room is a closable chunk.
4. **Senses and salience:** sound through walls, smells, the dark, the "Meanwhile" channel from the event log, BRIEF/VERBOSE.
5. **The whole game:** museum halls, carried items (`dose`, `test_kit` stand-ins become TAKE and USE), scenarios, screen-reader testing with real users.

### Risks

- **Two front-ends drifting.** A new machine built in 3D without its text form. Mitigation: make the text form fall out of the same registry, and add a test that every component in a room's model has an EXAMINE and every control a verb (as `museum-bindings.test.ts` checks bindings).
- **Interactions only in view code.** Until lifted, text mode cannot do them; worse, they are untested headless. Lifting them is good for the 3D game too.
- **Salience is taste.** Too much listing and it is a parts catalogue; too little and the player is lost. Needs the owner's eye on a few rooms early.
- **The no-peeking rule** must hold in text, where it is tempting to print the model's truth. EXAMINE takes only what the 3D inspection would.
- **Scale of description.** Rooms with hundreds of parts (the Olympic plant room) need grouping by region and kind, or they will read like an inventory.
- **Test coverage:** every machine gets text tests (transcript snapshots, as `__snapshots__` are used now), which is a lot of tests, but cheap and fast ones.

## 10. How it builds on missions 125 to 127

nicole_buruaah's briefs (125: jump the camera to an object by `?look=<tag|asset|exhibit>`; 126: the dev panel's room list expanding into lookable objects; 127: every object indexable, with tags on scene objects) were not yet on `origin/main` when this was written. They are the foundation: 127's index (every object, its tag, its room and, ideally, its region) is exactly `contentsOf(location)`, and 126's room-to-objects tree is the text mode's "You can see..." list. The text mode adds one requirement to that index: each entry should also carry its kind and its controls (verbs and actions), and should be built in logic from the model, not harvested from the scene graph, so that text mode can read it without Three.js. If 127 harvests from scene objects, text mode needs the same data from the model side; the two should be one source, checked against each other by a test. Conversely, text mode is a stringent test of 125 to 127: any object a player cannot LOOK AT by its tag is an object the index has missed.
