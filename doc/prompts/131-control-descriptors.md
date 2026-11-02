# 131: Control descriptors: one scene-free description of each kind of game object

The owner, 2026-11-02, settling the "Shared foundation" and "Open questions" of missions 128, 129 and 130: before 129, 130 and 128's later stages, build **one shared, scene-free descriptor per kind of game object**: its parts, its controls (each with a stable id), the world action (`WorldAction`, `src/game/world.ts`) each control drives, its visible readings (only what its own lamps, displays, gauges and positions show), and its main view states as curated presets with page controls, not every combination. The 3D views read their controls from it, so the text mode and the 3D world cannot drift. Read `CLAUDE.md`, missions 125 and 126 (done) and the briefs of 127 to 130 first. Reviewed by Codex 2026-11-02; its corrections are folded in.

## Why

Today a control's meaning is scattered and incomplete. Some of it is in data (overlay parts' `PartDescription`s carry their world actions and readings, `src/game/plant/part-inspection.ts`; a few mimics have pure command functions), but most lives in view code: the Jacuzzi cabinet's POWER selector calls `jacuzziWorldBinding(store).setPower`, its valves' handles call `store.dispatch({ type: 'plant/valve', … })` in `views/cabinet-services.ts` and `views/room-pipework.ts`, a mimic's START calls `pressPump` (`rooms/plant/pump-panel.ts`). Nothing outside a built scene can ask "what can be worked on PL3-CAB1, and what does it do?". Three missions need exactly that:

- **128** (text mode) turns verbs into world actions and describes what the player can see: it needs every control's id, verbs and action, and every reading, without Three.js.
- **129** (room audit) has a "controlled by" column: which control drives which model object.
- **130** (item audit) has a magic room with a state knob: it needs each kind's representative states and a way to put a copy into them.

Written separately, each would invent its own list. One descriptor, read by the 3D views too, keeps them all in step.

## What there is now (checked 2026-11-02)

- **World actions:** `WorldAction` in `src/game/world.ts` (`plant/valve` with a valve's id, `plant/isolator` with an `IsolatorName`, `jacuzzi/cabinet` power and reset, `jacuzzi` toggle jets or air, `pool/setpoint`, `pool/drain-down`, `motor/starter`, `boiler-house`, …); `applyAction` runs one; `describeAction` (`src/game/events/describe-action.ts`) says what happened.
- **The Jacuzzi plant room** (`plant_pool_03`, PL3) is built from its schematic (`src/game/plant/jacuzzi-schematic.ts`): 12 schematic valves (8 motorised on the cabinet, 4 by lever), the cabinet's power isolator `PL3-CAB1-IS1` (`jacuzzi.isolator`, the world's `Jacuzzi cabinet isolator`), and the day tanks' 6 chemical valves (`schematic-parts.ts`), 18 valves in all, each with id, tag and normal state in `MODEL_VALVES` (`model-valves.ts`). The drain valve `PL3-CAB1-DV1` is the pool's drain-down: its view dispatches `pool/drain-down`, and the world also routes `plant/valve` for `jacuzzi.drain` to the same state (`world.ts`). The descriptor keeps the view's `pool/drain-down` as its one canonical action, so behaviour does not change. The eight motorised valves are worked from the room's valve panel (`JACUZZI VALVES`, the schematic's `valve-panel` node, OPEN and SHUT for each), and by hand only through the red override button on each actuator. The cabinet's front (`rooms/plant/spa-pack.ts`): POWER selector, RESET, JETS and AIR illuminated buttons, the display's setpoint step buttons and the filter's MODE and WASH NOW; its doors are view-held. What its panel shows is `jacuzziCabinetPanel(world, doorOpen)` (lamps, display lines), which takes the view's door state as an argument.
- **Mimics** are spec-driven (`MimicSpec`, `components/industrial-control/logic/mimic.ts`): `buttons` (each an id), `modes` (the page buttons, view-held), `lamps`, `readouts`. Of the control room's (`control_room`, CR): `MAIN_POOL_MIMIC` (CR-MP1, kind `mimic-pool`; pumps' START and STOP through `pressPump`), `HEATING_MIMIC` (CR-MP2, `mimic-heating`, modes only), `LOUNGE_FILTER_MIMIC` (CR-MP6; its buttons through the pure `loungeFilterMimicCommand`), `BOILER_HEAT_COPY` (CR-MP7; START and STOP through `boilerHeatPress`), `JACUZZI_MIMIC` (CR-MP9) and `GAS_MIMIC` (CR-MP8), read only. CR-MP3 (`mimic-air`), CR-MP4/5 (wet hall boards) and CR-MP10 (energy) are built by their own views.
- **Readings and inspection:** `inspectComponent` (`src/game/plant/component-inspection.ts`) and `describeComponent` / `resolveStatus` (`component-descriptions.ts`, `component-status.ts`) give the overlay's heading and status; parts marked in scenes carry `PartDescription`s (`command` with its action, `indicator` with its condition, `reading`), e.g. `LOUNGE_FILTER_MIMIC_PARTS`. The overlay's rule is no peeking: only what the thing itself shows.
- **Refs and the catalogue:** 125's ref form is a tag, then a part after a slash (`BH-CP3/display`); 126's `lookCatalogue(room)` and `kindCatalogue()` (`src/toolkit/gallery/logic/`) list each room's tagged entries and each kind (`jacuzzi-pack`, `butterfly-valve`, `chem-day`, `balance-tank`, `mimic-pool`, …) with class `plant`, `non-plant` or `decorative`.

## The descriptor

Pure, in `src/game/descriptors/` (no DOM, no Three.js), tested beside it. Two levels: a **kind descriptor** (what every copy of a kind has) and the **object descriptors** it makes for each copy (with its tag, room and bindings).

```ts
interface ObjectDescriptor {
  ref: string; // 125's ref of the object: its tag, 'PL3-CAB1'
  room: string; // 'plant_pool_03'
  kind: string; // 126's kind key, 'jacuzzi-pack'
  class: 'plant' | 'non-plant' | 'decorative' | 'architectural';
  name: string; // from the model, never written by hand
  controls: readonly Control[];
  readings: readonly Reading[];
  view?: readonly ViewState[]; // view-held state: doors, pages
  presets: readonly Preset[]; // curated representative states
}
interface Control {
  key: string; // the part key: 'power'
  ref: string; // `${object ref}/${key}`: 'PL3-CAB1/power'
  label: string; // its legend: 'POWER'
  form:
    | 'selector'
    | 'push-button'
    | 'illuminated-button'
    | 'valve-handle'
    | 'valve-actuator'
    | 'isolator'
    | 'page-button';
  inputs: readonly string[]; // what can be done to it: ['on', 'off'], ['press'], ['open', 'shut']
  local?: boolean; // only on the plant room's own panel
  /** The world action an input sends, as the world stands; null when it does nothing. A page button has none (it changes view state). */
  action?(world: World, input: string): WorldAction | null;
  /** Its own position, as seen: 'on', 'open'. */
  position?(world: World): string;
  /** What it works, as model refs ('fitting:jacuzzi.suction', 'PL3-CAB1'): 129's "controlled by", never inferred from the action. */
  targets: readonly string[];
}
interface Reading {
  key: string;
  ref: string;
  label: string;
  form: 'lamp' | 'display' | 'gauge' | 'position' | 'readout';
  read(world: World, view?: ViewValues): string | number | boolean | null;
}
interface Preset {
  id: string;
  label: string;
  actions: readonly WorldAction[]; // how a world is put into it
  seconds?: number; // world time run after the actions
  view?: ViewValues; // and the view state shown with it
}
```

A preset is applied by a pure `applyPreset(world, preset)` that returns a new world: the consumer chooses which world. 130's magic room applies it to a scratch world of its own, never the saved one; 128 never applies presets. A descriptor does not assume a view: a kind with no 3D drawing (a model block, a signal, a schedule) still has a descriptor, with its purpose, its targets and readings, and no controls if nothing works it (the owner, 2026-11-02, for 130's magic pages).

**Worked example, the Jacuzzi cabinet, `PL3-CAB1`:** controls (with `targets: ['PL3-CAB1']`) `PL3-CAB1/power` (selector, `on`/`off` → `{ type: 'jacuzzi/cabinet', action: { act: 'power', on } }`, position from `world.jacuzziCabinet.power`), `PL3-CAB1/reset` (push button → `jacuzzi/cabinet` reset), `PL3-CAB1/jets` and `PL3-CAB1/air` (illuminated buttons → `{ type: 'jacuzzi', action: { act: 'toggle', what } }`), `PL3-CAB1/set-up` and `PL3-CAB1/set-down` (→ `pool/setpoint` a step from the present setpoint, clamped as the view clamps it), the display's `PL3-CAB1/display` (a page button, view state) and the filter's `PL3-CAB1/wash-mode` and `PL3-CAB1/wash-now` (→ `spa-filter`; WASH MODE's first press only shows the wash page, view state, as the view does); readings `PL3-CAB1/pump-run`, `/no-flow`, `/uv`, `/dosing` (lamps) and `/display` (its two lines), all from `jacuzziCabinetPanel(world, view.doorOpen)`; view state `doors` (`shut`, `open`); presets `in-service` (no actions), `off` (POWER off), `doors-open` (view only), `tripped` (suction valve shut and a minute's `time/skip`, giving the no-flow trip through the world). A lever valve, `PL3-BT1-IV1`: control `PL3-BT1-IV1/handle`, inputs `open`/`shut` → `plant/valve` with its model id (`jacuzzi.makeUp`), target `fitting:jacuzzi.makeUp`; reading its position. A motorised valve, `PL3-CAB1-IV7`: its reading is its position; its controls are its actuator's `PL3-CAB1-IV7/override` (press: the opposite of where it stands) and the valve panel's `valve-panel/PL3-CAB1-IV7-open` and `-shut` (the panel has no tag of its own, so its ref is its name's slug, resolved within the room); the drain valve's → `pool/drain-down`. The isolator `PL3-CAB1-IS1`: control `/handle` → `plant/isolator` `Jacuzzi cabinet isolator`.

A mimic's descriptor is made from its spec together with its pure command function and its state function: the spec names its buttons, modes, lamps and readouts but carries neither actions nor readings. One control per `buttons` entry (its spec id the key, `CR-MP1/p1-start`), its action from the same pure command function the view calls (`mainPoolMimicCommand`, lifted out of `pump-panel.ts`'s `pressPump`; `loungeFilterMimicCommand`; `boilerHeatPress`); one `page-button` per mode with the mode as view state; one reading per lamp and readout from the board's state function where that is pure (`mainPoolState`, `heatingState`, `loungeFilterMimicOf`, `jacuzziMimicState`; the boiler house's boards read a view's state and get their readings in stage 2); presets one per mode. Where a part already has a `PartDescription` (`LOUNGE_FILTER_MIMIC_PARTS`), the descriptor and it must agree, and a test says so.

**The no-peeking boundary is explicit:** a reading reads only what that part shows. Where a world helper needs view-held state (`jacuzziCabinetPanel`'s door), it is a declared `view` value, never assumed; visibility and darkness are applied by the consumer (128) before narration.

**Class:** the kind's class from `EQUIPMENT_KINDS` (126's catalogue). The descriptor's class type also allows the owner's `architectural` class (2026-11-02), which `Classification` does not have yet (127 owns adding it to the shared classification): signs, electrical fittings (light switches, sockets, spurs, not the modelled distribution), fire fittings and doors, which have a game function but are not part of the simulation yet; named and lookable, never flagged unbound. A door's open/shut and a light switch's on/off are valid view states and controls where the game already has them.

## Who reads it

- **The 3D views:** where a view builds a control the descriptor covers, it takes the action from the descriptor (`control.action(world, input)`) and dispatches it, rather than writing the action itself. Behaviour does not change; tests prove the same actions fire.
- **128:** verbs map to `inputs` (OPEN/CLOSE → `open`/`shut`, PRESS → `press`, TURN ON/OFF → `on`/`off`); EXAMINE and READ list `readings`; replies come from `describeAction`.
- **129:** "controlled by" is the descriptors' controls whose actions name that object (a valve's id, an isolator's name, a motor's tag), including those in other rooms (the control room's copies).
- **130:** the magic room's state knob is the presets; page controls are the `page-button` controls.
- **126's catalogue:** a kind's entry may show its controls (key, label, inputs).

## Ids

A control's id is its object's ref, a slash, and its part key: `PL3-CAB1/power`, `CR-MP1/p1-start`, `PL3-CAB1-IV7/handle`. Keys are the ones the scene already gives the part where it has one (a mimic button's spec id), else a short lower-case word. They are stable. The scene marks are 127's: a mimic's scene keys today carry a board instance number (`mimic-board.ts`), so a look link to `CR-MP1/p1-start` resolves only once 127 marks parts with these keys; 131 defines the keys and 127 tests that its marks match them (Codex recommended this split; it keeps 127's marking and scanner ownership).

## First delivery

1. The registry: kind descriptors, `objectDescriptors(room?)`, `descriptorFor(ref)`, `controlFor(ref)`.
2. **The Jacuzzi plant room:** the cabinet PL3-CAB1, its isolator PL3-CAB1-IS1, its 18 valves, the balance tank PL3-BT1 (its gauge) and the day tanks PL3-DT1 and PL3-DT2 (their levels).
3. **The control room's spec-driven mimics:** CR-MP1, CR-MP2, CR-MP6, CR-MP7, CR-MP8 and CR-MP9 (buttons, modes, lamps and readouts).
4. **dev0's boards** where practical; otherwise listed for stage 2 (their controls are view-built, with no command functions yet).
5. **Views reading from it,** where the change is contained: the cabinet's world binding (`jacuzziWorldBinding`), the PL3 valves, valve panel and isolator in `cabinet-services.ts`, and the mimics' press handlers in `rooms/plant/control.ts`, `pump-panel.ts` and `control-room-upper-mimics.ts`.
6. **Coverage tests:** every descriptor control with an action gives a `WorldAction` that `applyAction` accepts and that changes the world or is documented as a no-op in that state; for the covered rooms, every 3D control's action comes from a descriptor (the bindings and press handlers are checked against the descriptors' actions).
7. 126's kind catalogue shows a kind's controls from the descriptor, if cheap.

## Acceptance

- Pure tests: PL3 has descriptors for CAB1, IS1, BT1, DT1, DT2, the valve panel and all 18 valves; each control's id is unique and in the ref form; each action is a valid `WorldAction` that `applyAction` accepts. Each control is classed by what applying it does in a fresh world: a visible change to its own reading or position (POWER off: the panel dark; a valve shut: its position `shut`), accepted but interlocked or a no-op in that state (RESET with no trip; START on a pump in HAND), documented per control; each preset applied to a fresh world gives the reading it promises; each mimic's button actions equal the view's command function's.
- The 3D views fire the same actions as before (tests on the bindings), and in the browser the Jacuzzi cabinet and a control-room mimic still work (one screenshot each).
- typecheck, lint, format, tests and build pass.

## Later stages

- **Stage 2:** the other plant rooms built from a schematic (pool rooms 1, 2 and 4, the boiler house, the wet hall), their local panels (HAND · OFF · AUTO, trip resets, marked `local`), and dev0's boards if not in the first delivery.
- **Stage 3:** view-held state lifted where text mode needs it (cabinet doors, display pages), and the 3D parts' marks carrying their control ids (with 127).
- **Stage 4:** the museum halls, the bridge's touch screens, architectural fittings (doors, light switches), then every remaining kind, with a coverage report of kinds with no descriptor.

## Not in this mission

No new world state (no `WORLD_VERSION`); no text mode (128), audit pages (129, 130) or new scene marks (127).

## Records

The plan in `doc/plans/131-control-descriptors.md`; the CHANGELOG under Unreleased (`### Added`); `TODO.md`: this mission and its later stages.
