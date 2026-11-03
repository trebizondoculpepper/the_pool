# 146: The ideal modulating temperature controller: model, placeholders, and a valve designed for constant adjustment

The owner, 2026-11-03: before finishing the Water Margin TC-1 touch-screen controller (mission 144's pool temperature control, `watershed-pool-temperature-controller`), design the _ideal_ feedback controller underneath it — a machine intended to regulate a value, of which a temperature controller is a sub-type — and trial it with placeholders. The owner's words through the session: "I want a placeholder valve, and a placeholder thermal probe"; "I also want a placeholder temperature controller … same size and shape as the watershed controller, but very simple: Set red 7-segment LED, Actual red 7-segment LED, Control rotary selector, Hand/off/auto rotary selector, output valve open"; the sensitivity "determines how small a deviation in temperature can result in the valve being fully open"; "let's use band_K set from 1 to 10 with 1 as aggressive"; the valve-open indicator "can be a bar-graph LED stack … a line of 10 LEDs, so easily replicated"; and a new kind of valve "designed for constant modulation which sounds and looks different. All our current valves are open/shut affairs." Read `CLAUDE.md` (real working components; the model first; local controls; one world state; displays redraw only on change; the benchmark), `doc/plant-model.md` and `doc/agent-tooling.md` first.

## The design, settled with the owner

- **The ideal controller** is pure logic: it takes a measured value, holds a set point and a band, and outputs a command 0–1. A temperature controller is one sub-type. `command = clamp((setpoint − measured) / band, 0, 1)`.
- **The valve is a separate machine** that turns the command into an actual position over a finite stroke, so a change is seen happening. (The existing `actuated-valve.ts` logic is for on/off; the modulating valve has its own, continuous, stroke.)
- **Sensitivity is the band in kelvin, 1 to 10, 1 aggressive.** The dial reads the band directly: `band_K = the dial (1–10)`; 1 K below set point at band 1 asks full output, at band 10 asks 10%.
- **The current pool valve "fires constantly"** because mission 144 used `THERMAL.band = 0.1 K` — an absurdly high sensitivity, so the valve slams 0↔100% as the pool crosses a 0.1 K line. The ideal model's band (1–10 K) fixes that; record it in the plan.

## What to build

1. **The model, wired and tested first** (the owner's order: "wire in the model, test that the model works" before visuals). In `src/toolkit/components/plant/logic/modulating-control.ts` (already started): `ControllerModel` (measured, setpoint, band, output), `controllerOutput`/`temperatureOutput`, the modulating valve state and `stepModulatingValve` (finite stroke, holds its place unpowered), and the band mapping. Tests beside it cover the proportional law, clamping, the band dial's 1–10 meaning, the stroke, and hold-without-power. This is pure logic; the world binding comes later (the game's `poolTemperatureControls` already exists — the ideal model's role is to be what the Water Margin screen and the placeholder both show).
2. **The placeholder temperature controller** (`views/temperature-controller-placeholder.ts`): same 430 × 290 × 150 mm body as the Water Margin controller, a simple fascia: SET (red 7-segment LED), ACTUAL (red 7-segment LED), a BAND rotary selector (1–10, aggressive at 1), a HAND/OFF/AUTO rotary selector, and a valve-open indicator as a row of 10 LEDs (the Soft Starter's `bar` pattern, `cabinet-fittings.ts`: ten small amber segments lit by their count). It reads the ideal model and drives the placeholder valve. Bind it, work it, and try it in a dev room first per the rules.
3. **The placeholders already started:** `views/modulating-valve-placeholder.ts` (body + rising stem showing opening) and `views/thermal-probe-placeholder.ts` (stem-into-pocket probe with `read()`). Finish binding them into the controller's loop.
4. **Research the modulating valve** (`doc/research/modulating-control-valve.md`): what a valve designed for constant adjustment looks like, sounds like and is built like — a 2-port globe control valve with a linear (rising-stem) actuator and positioner, after a real product (Siemens VVG41/SKD, Honeywell, or a British equivalent), versus the game's current open/shut quarter-turn butterflies and lever valves. The finished valve replaces the placeholder later (its own logic, geometry and sound); record the research now.
5. **A dev-room trial loop** (per the owner): the controller, its probe and its valve on a heat source whose temperature fluctuates, so the controller can be seen switching the valve to regulate — "We want to observe that this temperature controller can switch on and off a heat exchanger valve to try to regulate the temperature." Set it up in a dev room (dev27 pool heating, or dev65), its heat source varying, the valve visibly moving, the bar showing its opening.
6. **Records:** plan in `doc/plans/146-modulating-temperature-control.md`; CHANGELOG under Unreleased; `TODO.md` entry.

## Order of work (the owner's)

1. Wire the model; test that it works (pure tests green).
2. Add and bind the visual elements (placeholder controller, valve, probe) to the model.
3. Research the modulating valve and record it.
4. The dev-room trial loop, so the owner can watch it regulate on waking.
5. Records, checks (typecheck, lint, format, tests, build), commit and push via the private-index route, announcing on the mailbox.

## Out of scope now

The finished Water Margin TC-1 screen (the 320 × 200 TFT HMI, `watershed-hmi.ts`, is started but not wired); the finished globe valve and its sound; replacing the plant rooms' existing controllers; integral action (PI/PID) — the proportional offset is accepted for now; the hall air coils.
