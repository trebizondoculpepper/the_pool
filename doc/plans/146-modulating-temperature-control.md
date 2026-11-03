# 146: Modulating temperature control — plan

The owner, 2026-11-03. Brief: `doc/prompts/146-modulating-temperature-control.md`. Design the ideal feedback controller (temperature controller as its sub-type), wire and test the model first, then the placeholder visuals (controller, valve, probe), then research the modulating valve, then a dev-room trial loop to watch it regulate. This plan records the decisions and the order; the research note `doc/research/modulating-control-valve.md` records the valve study.

## Prototyping rooms (the owner, 2026-11-03)

- **Magic rooms prototype the visual appearance of a single object.** They are the cheap surface for seeing a component's design: `MODELS` in `room-equipment.ts` is the single registry of every real component with a standalone 3D form, and `adapterFor`/`fromModel` builds its magic room automatically — no hand-written adapter, no side-channeling models into the world. A new component is registered in `MODELS` (its size, mount and `build`) as part of its normal build, and gets a magic room for free. (The weather station alone keeps a curated `EXPLICIT` adapter, for its LOOK/PAGE selectors.)
- **Dev rooms are interactive integration tests of features.** They earn their keep when the prototype is about several machines working together — a full loop, real plumbing, a walk-in space — which a single-object magic room cannot show. The mission 146 modulating-control loop is such a case: it lives in dev65 as a whole-loop trial, while each component (controller, valve, probe) also has its magic room.
- Both are prototypes, not the shipped plant; a component bound to the world in a dev room is a working trial, and its magic room is the appearance review.

## The ideal model (done in logic first)

Pure, in `src/toolkit/components/plant/logic/modulating-control.ts`, tested beside it.

- `ControllerModel`: `measured`, `setpoint`, `band`, `output`.
- `controllerOutput(measured, setpoint, band)` = `clamp((setpoint − measured) / band, 0, 1)`. At or above set point: 0 (valve closed). One band below: 1 (fully open).
- `temperatureOutput(measuredC, setpointC, bandK)`: the temperature sub-type, band in kelvin.
- **The band dial is 1 to 10 kelvin, 1 aggressive.** `band_K = the dial value`. (The owner, 2026-11-03: "let's use bands_K set from 1 to 10 with 1 as aggressive".)
- `ModulatingValveState`: `command`, `position`, `strokeSeconds`, `powered`. `stepModulatingValve` moves position toward command over the finite stroke; unpowered it holds its place.
- **The defect it fixes:** mission 144 drove the pool valve with `THERMAL.band = 0.1 K` — the valve slams 0↔100% because the pool is almost always more than 0.1 K from set point. The ideal band (1–10 K) makes it genuinely proportional.

Tests (`modulating-control.test.ts`): the proportional law at 0/one-band/between; clamping; the 1–10 dial meaning; the finite stroke; hold-without-power. Green.

## The placeholder controller (visual, bound to the model)

`views/temperature-controller-placeholder.ts` — same body as the Water Margin (430 × 290 × 150 mm, grey moulded, deep blue-grey front), simple fascia:

| Control       | Part                                                                                                      |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| SET           | red 7-segment LED (`createSevenSegment`)                                                                  |
| ACTUAL        | red 7-segment LED (`createSevenSegment`)                                                                  |
| BAND          | rotary selector, 1–10 (`selector`, positions 10), 1 aggressive                                            |
| HAND/OFF/AUTO | rotary selector (`selector`, 3 positions), local-only                                                     |
| Valve open    | a row of 10 LEDs, the Soft Starter's `bar` pattern (ten 0.006 × 0.01 × 0.003 amber segments lit by count) |

It reads the ideal model (a controller object with measured/setpoint/band) and drives the placeholder valve. Its SET and BAND and mode are worked; ACTUAL and the bar read the model. Period: a simple single-purpose instrument, consistent with "much of the plant around 2000".

## The placeholders (started, finish binding)

- `views/modulating-valve-placeholder.ts`: body between flanges + a housing + a rising stem whose height shows opening; takes a command 0–1, moves over the stroke. Real working component (the project rule — engineering items are never static props).
- `views/thermal-probe-placeholder.ts`: stem-into-pocket probe with a head and `read()`, reporting the measured temperature.

Both to be replaced by the finished globe control valve and Pt100 pocket probe (the research).

## The dev-room trial loop

Per the owner: a heat source whose temperature fluctuates, the controller switching the heat exchanger valve to regulate. In a dev room (dev27 pool heating, or dev65), the placeholder controller + probe + valve on the loop: the probe reads a fluctuating source temperature, the controller holds its set point with its band, the valve opens and closes to regulate, its bar and stem show the opening. The owner watches it regulate on waking. Set up as an exhibit or a dev room per the room's nature, benchmarked.

## The modulating valve research

`doc/research/modulating-control-valve.md`: what a valve designed for constant adjustment looks, sounds and is built like — a 2-port globe control valve with a linear rising-stem actuator and a positioner, after a real product (Siemens VVG41 two-port valve with an SKD/SQX linear actuator; Honeywell; a British pool/boiler equivalent). Compare with the game's current valves (hand lever ball/butterfly, quarter-turn actuated butterfly — all open/shut). Note its sound (continuous geared/servo hum while modulating, no relay click + end-stop thud) and its look (the rising stem and the plug's travel are legible from across the room). The finished valve replaces the placeholder later.

## Order

1. Model + tests (green).
2. Placeholder controller view, bound; placeholders finished and bound.
3. Research the valve, recorded.
4. Dev-room trial loop, so the owner can watch.
5. Records (CHANGELOG, TODO), checks, commit and push via the private-index route, announced.

## Out of scope now

The Water Margin screen wiring (started in `watershed-hmi.ts`, not bound); the finished globe valve and its sound; replacing the plant rooms' existing controllers; PI/PID integral action; the hall air coils.
