# 148: The pool temperature controllers' model put right (PL1-TC1, PL2-TC1), and their HAND/OFF/AUTO knob

The owner, 2026-11-03: re-plumb PL1-TC1, and "fix the model first"; also "PL1-TC1 and PL2-TC1's hand/off/auto knob doesn't react to clicks". `nicole_buruaah` found the model faults below and wrote this brief. Brief only; not started until the owner says.

Read first: `CLAUDE.md` (especially: the model comes first and the enhanced network is the one source of truth; the scene only binds; tags and names are derived; one world state; all input through `src/toolkit/controls/`; pure logic in `logic/` and `src/game/`, tested beside it; the commit rules); `doc/plant-model.md`; `doc/agent-tooling.md` (look links, the room audit, the simulation graph pages); `doc/prompts/144-pool-temperature-control.md` and `doc/prompts/146-modulating-temperature-control.md` with their plans in `doc/plans/`; `doc/research/pool-temperature-control.md`.

**Coordinate before editing.** Other agents work in this checkout. `bala_qasim` (mission 144) and `sayuri_shantian` (mission 146) had uncommitted edits in the files below on 2026-11-03; say on agent-inbox which files you are taking, and get their agreement or wait for them to commit. Stage only your own hunks, through a private index. Don't spawn sub-agents without the owner's permission.

## Background

Missions 144 and 146 gave the Lounge (plant 1, `plant_pool_01`) and the Olympic (plant 2, `plant_pool_02`) a pool temperature controller (PL1-TC1, PL2-TC1) driving a motorised LTHW control valve on each pool's heat exchanger. The world logic is `src/game/plant/pool-temperature-control.ts` (world actions `pool/temperature-control` and `pool/setpoint`).

## Part 1: the model

1. **The control valve exists twice.**
   - The Lounge's `src/game/plant/lounge-schematic.ts` has a machine node `temperature-control-valve` (kind `regulating-valve`, "Lounge pool exchanger LTHW temperature control valve", about line 54); the controller's output link ends at it ("Temperature controller output to LTHW control valve", `['temperature-controller','output']` → `['temperature-control-valve','command']`, about line 295).
   - There is also a fitting on the edge "Heating flow to the heat exchanger", `plant_pool_01.exchanger.primary-flow.temperature-control` (kind `regulating-valve`, `operator: 'motor'`, `role: 'HX LTHW temperature control valve'`, about line 485): the valve actually in the pipe, which the plumber places and the scene draws.
   - The Olympic has the same pair in `src/toolkit/gallery/logic/olympic-plumbing.ts` (the node about line 1403, `code: 'CV1'`; its output edge about line 1477).

   Fix: make the in-line fitting the one control valve. Remove the duplicate machine nodes and their output links, and record the controller → valve command the way this codebase records control of motorised fittings. Find that convention first: look at how the Wash-O-Tron's motorised filter valves and the Jacuzzi's `fitting:jacuzzi.drain` are driven (`src/toolkit/gallery/logic/sim-graph/drivers.ts`, `sim-graph/sources/relations.ts`) and at 131's descriptors (`src/game/descriptors/`). If no convention links a controller's output to a fitting, add the smallest one that fits the model's types (a `drivenBy` on the fitting, or a control relation record) and explain it in the plan. Keep the valve's tag derived, not hand-written. Update every user of the node id: `src/toolkit/gallery/logic/sim-graph/state-adapters.ts` (about lines 113 and 213) and the tests.

2. **The temperature sensor is attached to the wrong thing.** The Pt100 is named "Lounge pool exchanger outlet Pt100" (TE1), but its process link is "Pool-water temperature to Pt100", `['pool','temperature']` → `['temperature-probe','process-value']`; the Olympic's `pool-temperature-sample` edge is the same. Make the model agree with the name, following the research note's normal practice (a sensor on the pool water leaving the exchanger, or on the pool return): if on the exchanger outlet, take its process value from the exchanger's pool-side outlet (its `pool-out` port or the link leaving it); if on the pool return, rename it to match. Make sure the world's controller measures what the model says it does: if the world reads pool temperature, either keep that and name the sensor for it, or make the measurement follow the exchanger outlet, with tests; record the choice. `src/toolkit/gallery/views/room-pipework.ts` (about line 409) draws the probe bound to `model: { node: 'temperature-probe' }`; keep it drawn where the model now says it is.

3. **The registered label.** `src/game/plant/installed-asset-ids.ts` has `plant_pool_01|pool-temperature-controller:analogue|Lounge pool pool temperature controller` (asset-0166, PL1-TC1), and the Olympic's "Olympic pool pool water temperature controller". The doubled "pool pool" comes from the label in the layout specs (`src/toolkit/gallery/logic/room-equipment.ts`): fix it there and change the register's key to match, keeping the same asset ids and tags (asset ids never change). Check whether the `:analogue` / `:digital` variant keys still describe what mission 146 builds.

Checks for Part 1:

- the binding tests (`world-in-model`), both rooms' schematic tests, `olympic-plumbing.test.ts`, the sim-graph tests;
- the room audit (`bench.html?bench=room-audit&room=plant_pool_01` and `plant_pool_02`): no orphan, unbound or duplicate flags for the controller, sensor or valve;
- the simulation node pages (`bench.html?bench=sim-node&node=…`): controller → valve (the fitting), sensor ← the exchanger outlet (or the pool return, as chosen);
- look links: `?room=plant_pool_01&look=PL1-TC1&mode=front`, the same for PL2-TC1, and a look at each valve.

## Part 2: the HAND/OFF/AUTO knob doesn't react to clicks (both controllers)

The controller is mission 146's Water Margin controller (`src/toolkit/components/plant/views/temperature-controller-placeholder.ts`). Its mode knob is a three-position `selector` (HAND · OFF · AUTO, about line 302) added to the controller's `parts`. The plant rooms build it in a special case in `src/toolkit/gallery/views/room-equipment.ts` (around lines 395–445), which returns `parts: controller.parts`, and whose `change()` dispatches only `auto` and `hand` to the world (OFF is a local-only latch).

- Find why a click does nothing: whether the room's use raycast reaches these parts (the parts registered with the room's `PartSet` and uses); whether the selector's `bound.value` snaps back because the world never holds `off`; whether something covers the knob.
- Make all three positions work. If OFF must be a real state, add it to the world's pool temperature control (a world change: reserve a `WORLD_VERSION` on the mailbox and add a migration); otherwise make the local latch hold.
- Check the set-point and band knobs for the same fault.
- A test for the pure part, and a browser check: click each position; the knob turns and the world or the controller's state follows.

## Rules and records

Model first, then the scene; nothing drawn that is not in the model. Before committing: `npm run typecheck`, `npm run lint`, `npm run format:check`, the targeted tests (`--maxWorkers=2`), `npm run build`, then one full `npm test` announced on agent-inbox (one full run per machine). Commit only your own hunks, through a private index. The plan in `doc/plans/148-temperature-controller-model-fix.md`; the CHANGELOG under Unreleased (`### Fixed`); `TODO.md` ticked with its date and commit; `doc/agent-tooling.md` if a tool changes.

Report: what changed in each model, the convention used for controller → fitting, where the sensor now reads, the knob's cause and fix, test results, commits, and screenshots by look link.
