# Mission 149 plan — the heat exchangers' modulating LTHW control valves sound as if they are always running

Brief: `doc/prompts/149-modulating-valve-sound.md`. The owner, 2026-11-03. The pool heat exchanger control valves sound constantly running; OFF stops the noise. `nicole_buruaah` investigated and wrote the brief; the cause is that the valve's actuator logic is binary (`target()` returns 0 or 1), so any part-open position looks perpetually "travelling". This plan records the chosen design and the coordination; the report is the CHANGELOG entry and the tests.

## Cause (confirmed)

- `room-pipework.ts` draws the exchanger's `controllerPool` valve with `createActuatedButterflyValve`, `position()` = `world.poolTemperatureControls[pool].valvePosition`, `open()` = `valvePosition > 0.01`.
- `actuated-butterfly-valve.ts` sets `command` from `open()` and `position` from `position()`; but `target()` in `actuated-valve.ts` is binary (`air && (energised || override) ? 1 : 0`).
- `travelling = |position − target| > 1e-6`, and `moving.value = travelling` holds `machineTone('gear-motor', …)`. At any part-open position the target is 1, the valve is "travelling" forever, `VALVE_STOP` never sounds. At 0 or 1 it is silent — why OFF stops the noise.

## Design (the owner, 2026-11-03)

1. **A valve may be on/off or modulating** (`logic/actuated-valve.ts`, pure + tested). Add an optional `targetPosition` (a commanded position 0–1) to `ActuatedValveState`; `target()` returns it (gated by `air`, clamped to the unit) for a modulating valve, and the existing binary value for on/off ones. On/off users leave `targetPosition` undefined and are unchanged. `limits()` and `strokeTime()` stay.
2. **"Moving" from real travel** (`actuated-butterfly-valve.ts`): the binding gains an optional `commandPosition?(): number`. Each update the view sets `state.targetPosition = commandPosition()` when provided; `moving` stays `|position − target| > 1e-6`, which now uses the commanded position, so a settled valve is silent and only the 0.1-step changes stroke (brief whirr then stop, `VALVE_STOP`). For a bound `position()` that doesn't also travel in the model, the commanded position drives the sound. The start relay click and pitch-by-direction are unchanged.
3. **The binding** (`room-pipework.ts` controllerPool) and the world: the valve needs its commanded position. `pool-temperature-control.ts` already returns `commandedPosition` in its step result; the decision is whether to store it in `poolTemperatureControls[pool]` (a world-shape change) or derive it each step. **Decision (pending coordination): store it as `commandedPosition` on the pool's control state** — the controller's demand and quantised command is exactly what the valve's sound must follow, and deriving it in the room would duplicate the pure logic. This is a `WORLD_VERSION` bump (78, after mission 148's 77) with a migration seeding parts from today's `valvePosition`. Coordinates on the mailbox (bala/nicole hold `pool-temperature-control.ts`).
4. **The lamp and override** (item 4): on a modulating actuator the lamp is a **power/command lamp** — `lamp = energised(state)` (set while the command is on), which is what the present code does; the manual override stays a declutch/handwheel that steps the manual output per the controls' rules. Recorded in the cue/description.
5. **The valve type** (item 5): a two-port globe valve with a linear actuator is the normal LTHW control valve, not a quarter-turn butterfly. The research (`doc/research/pool-temperature-control.md`) should confirm; proposed as a `TODO.md` follow-up, not redesigned here.
6. **Other users** (item 6): dev65's trial exhibit gets the same fix; the on/off users (`loungeValvePositions`, `booster-set`, `solenoid-valves`, `plant-gallery`) are untouched (their `targetPosition` stays undefined).

## Files

- `src/toolkit/components/plant/logic/actuated-valve.ts` + `actuated-valve.test.ts` (pure; the design's heart).
- `src/toolkit/components/plant/views/actuated-butterfly-valve.ts` (the binding's `commandPosition`, targetPosition wiring).
- `src/toolkit/gallery/views/room-pipework.ts` (controllerPool supplies `commandPosition`) — coordinated.
- `src/game/plant/pool-temperature-control.ts` (store `commandedPosition`; result already has it) + `world.ts`/`save.ts` migration (`WORLD_VERSION` 78) — coordinated.
- `src/toolkit/gallery/views/pool-temperature-control-trial.ts` (dev65 trial).
- `doc/plans/149-*`, `TODO.md`, `CHANGELOG.md`.

## Tests and checks

- Pure: a modulating valve at 0.3 with command 0.3 is not moving; a command step 0.3→0.4 moves it then stops; on/off valves unchanged.
- Browser: plant 2 (`?room=plant_pool_02&look=PL2-TC1&mode=front`) AUTO below set point sits part-open and silent between the 0.1 steps, a brief whirr on a step; OFF strokes shut, clunks, quiet; HAND 100 % strokes open then quiet. Same in plant 1. Recorded here.
- `npm run typecheck`, `npm run lint`, `npm run format:check`, targeted tests (`--maxWorkers=2`), `npm run build`, one full `npm test` announced on agent-inbox.