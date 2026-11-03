# 149: The heat exchangers' modulating LTHW control valves sound as if they are always running

The owner, 2026-11-03: the heat exchanger valves sound constantly running; the noise stops when the pool temperature controller is switched OFF. `nicole_buruaah` investigated and wrote this brief. Brief only; not started until the owner says.

Read first: `CLAUDE.md` (real working components; displays and sounds follow the model; pure logic in `logic/`, tested beside it; all input through `src/toolkit/controls/`; the commit rules), `src/toolkit/components/AGENTS.md`, `doc/agent-tooling.md`. Use look links to see the valves: `?room=plant_pool_02&look=PL2-HX1-CV1&mode=front`, and `PL1-HX1-CV1` in `plant_pool_01`.

**Coordinate.** Claim the files on agent-inbox before editing; `bala_qasim` (mission 148) had uncommitted work in `room-pipework.ts` and the controller files on 2026-11-03. Stage only your own hunks, through a private index. Don't spawn sub-agents without the owner's permission.

## The cause (investigated; confirmed by the owner's data point)

1. `src/toolkit/gallery/views/room-pipework.ts` (about lines 538–583) draws the pool heat exchanger's control valve (`v.controllerPool`) with `createActuatedButterflyValve`, bound so: `position()` = `world.poolTemperatureControls[pool].valvePosition` (0 to 1, now in 0.1 steps: mission 148's quantisation); `open()` = `valvePosition > 0.01`; `set(open)` puts the controller in HAND with its manual output 1 or 0.
2. `src/toolkit/components/plant/views/actuated-butterfly-valve.ts` (about lines 331–356) sets the valve's `command` from `open()` each frame and takes its `position` from `position()`; but `target()` in `src/toolkit/components/plant/logic/actuated-valve.ts` is binary: `air && (energised || override) ? 1 : 0`.
3. `travelling = |position − target| > 1e-6`, and `moving.value = travelling` holds `machineTone('gear-motor', …)`. So at any part-open position (0.1 to 0.9) the target is 1, the valve is "travelling" for ever, the motor plays without stopping and `VALVE_STOP` never sounds. At 0 or 1 it is silent, which is why OFF (demand 0, the valve stroked shut) stops the noise.
4. The same component is also used by the Lounge's on/off motorised valves (`room-pipework.ts`, about line 689, `loungeValvePositions`: they only travel between 0 and 1, unaffected), `pool-temperature-control-trial.ts` (dev65's trial exhibit, about line 141: probably affected), and `booster-set.ts`, `solenoid-valves.ts`, `plant-gallery.ts` (on/off).

## What to fix

1. **Modulating support in the valve's pure logic** (`logic/actuated-valve.ts`, tested): a valve may be on/off (target 0 or 1, as now) or modulating (a commanded position, 0 to 1). Add an optional `targetPosition` to the state and the binding, or a `modulating` kind; `target()` returns the commanded position for a modulating valve and the existing behaviour for on/off ones. `limits()` stay.
2. **"Moving" from real travel in the view:** the motor tone holds only while the valve actually strokes as the world steps it. For a bound `position()`, decide "moving" from |commanded − actual| above a small tolerance, the binding supplying the commanded position (preferred); or from the position changing between frames, with a short hold so frame jitter does not chop the sound. The start relay click when it starts and `VALVE_STOP` when it stops; the pitch from the direction of travel (opening higher, closing lower).
3. **The binding** in `room-pipework.ts` for `controllerPool` valves supplies the commanded position as well as the actual one. `pool-temperature-control.ts` returns `commandedPosition` in its step result; check whether the world keeps it in `poolTemperatureControls[pool]`. If not, decide whether to save it (a world shape change: reserve a `WORLD_VERSION` on the mailbox and add a migration) or derive it once per world step.
4. **The lamp and the override:** `lamp.set(energised(state))` lights whenever `valvePosition > 0.01`; decide what it shows on a modulating actuator (normally a power lamp, or none). Its manual override now forces the controller into HAND fully open or shut; a real modulating actuator's override is a declutch and handwheel that sets a position by hand. Either keep the present behaviour and say so in its cue and description, or make it step the manual output, by the controls' rules.
5. **The valve type:** a pool heat exchanger's LTHW control valve is normally a two-port globe valve with a linear actuator, not a quarter-turn butterfly valve. Check `doc/research/pool-temperature-control.md`; if it says so, propose the right component as a follow-up in `TODO.md`, and do not redesign it here.
6. **The other users:** dev65's trial exhibit gets the same fix; the on/off users behave exactly as before.

## Tests and checks

- Pure: a modulating valve at 0.3 with command 0.3 is not moving; a command step from 0.3 to 0.4 moves it, then it stops; on/off valves are unchanged.
- In the browser, plant 2 (`?room=plant_pool_02&look=PL2-TC1&mode=front`): AUTO with the pool below set point, so the valve sits part-open: silent between steps, a brief whirr when the 0.1 step changes; OFF: it strokes shut, clunks and goes quiet; HAND at 100 %: it strokes fully open and goes quiet. The same in plant 1. Record them in the plan.
- `npm run typecheck`, `npm run lint`, `npm run format:check`, the targeted tests (`--maxWorkers=2`), `npm run build`, then one full `npm test` announced on agent-inbox (one full run per machine).

## Records

The plan in `doc/plans/149-modulating-valve-sound.md`; the CHANGELOG under Unreleased (`### Fixed`); `TODO.md`: this item ticked with its date and commit, and the follow-ups (the valve type).

Report: the cause confirmed, the design chosen (`targetPosition` or a kind), what plays when, the lamp and override decision, test results, commits.
