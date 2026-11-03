# A control valve designed for constant modulation

Research for mission 146, 2026-11-03. The owner: "we probably also need a new kind of valve designed for constant modulation which sounds and looks different. All our current valves are open/shut affairs." This note records what a valve built for continuous adjustment is, after the real products the game models (Siemens VVG41 with a linear actuator, Honeywell, the British boiler/pool equivalents), so the placeholder can be replaced by a faithful component.

## What the game has now

Every current valve is an open/shut device:

- **Hand-lever valves** (`plantTools.butterflyValve`, the lever ball and butterfly valves): worked by hand to a stop, either open or shut (or parked mid-way by a fitter, not by the plant).
- **Quarter-turn actuated valves** (`actuated-butterfly-valve.ts`): a spring-return quarter-turn electric or pneumatic actuator, its solenoid/relay drives it open and its springs shut it; a limit switch box reports fully open or fully shut. Its sound is a relay click, a motor run-up, an end-stop thud, a spring's unwinding.
- **The pool temperature control valve** (mission 144): nominally an `ActuatedButterflyValve` given a 0–1 position, but that's a quarter-turn disc parking at partial angles — its mechanism, sound and look are still an on/off actuator's.

None is designed to sit at 20% or 63% for hours and adjust smoothly — the thing a modulating control valve does.

## What a modulating control valve is

A valve whose whole purpose is to **throttle continuously** — to hold any opening and to move smoothly between openings as the controller asks. Two families:

1. **Globe control valves** — the classic modulating valve. A plug rises off a seat inside a globe-shaped body (straight-through or angle pattern); the lift of the plug sets the flow. A **linear actuator** above the body moves the stem: an electric motor driving a rising stem, or a pneumatic positioner. The actuator carries a **positioner** (mechanical or electronic) that compares the 4–20 mA or 0–10 V command to the stem's actual position and drives until they agree.

2. **Rotary control valves** — a butterfly, ball or eccentric-disc valve on a **modulating actuator** with a positioner, able to hold intermediate positions and modulated. These exist too, but the globe valve is the archetype for heating control (the research's Siemens VVG41 is a two-port globe; its SKD/SQX range are linear actuators).

The game's research already chose a two-port modulating valve on the LTHW flow (`doc/research/pool-temperature-control.md`, the Siemens VVG41). So the finished component should be a **two-port globe control valve with a linear (rising-stem) actuator** — the real thing, at true size, as the project's rules demand. The Siemens references confirm the anatomy: the VVG41 two-port seat valve (threaded, DN 15–50, PN 16, equal-percentage over 30–100 %) with an SKD electro-hydraulic or SQX/SAX electromotoric actuator of 20 mm stroke, its hand crank, position indicator (0 to 1), and the coupling, stem and plug drawn in the datasheet's section. [VVG41 2-port seat valve data sheet](https://www.sipatec.org/files/uploads/siemens-vvg41-2-port-valve.pdf), [SKD.. electro-hydraulic actuators](https://sid.siemens.com/api/khub/documents/skS~DiKR1hwBZL~Bcefj4g/content), [SQX.. electromotoric actuators](https://cache.industry.siemens.com/dl/files/610/109784610/att_1041278/v1/10437.pdf), [Siemens Acvatix valves basic documentation](https://royalbrinkman.nl/product/attachment/W00003414/A6V10344991_Basic_Documentation_Valves_VVF.._2cVXF.._2cVVG41.._2c_VXG41.._2c_VVI41.._2c_VXI4_en_1__BD078672.pdf).

## How it looks

- **Body:** a globe-shaped (egg or flanged Y) valve body between its flanges, found endwise in the pipe — quite different from a wafer butterfly's thin disc. DN 50–80 for the pool exchangers' LTHW branches, in brass/gunmetal or cast iron with painted flanges.
- **Actuator:** a rectangular housing on the neck with a **rising stem** — a visible threaded spindle that extends and retracts as the valve opens, ending in a stem connector. A clear **position indicator** shows the stem travel, often with a 0–100% scale, so the opening is legible from across the room. Cables leave by a gland; a manual declutch and handwheel offer HAND.
- On a globe valve the plug's lift _is_ the opening, so the actuator's rising stem is the natural indicator — unlike the butterfly's rotating disc.

## How it sounds

Different from the open/shut actuators, and the game should sound it so:

- **Continuous, not clacking:** while the command differs from the position, a low geared-motor or servo hum sounds, its pitch or character following the movement; when the valve reaches the command it goes quiet. No relay click, no end-stop thud for every nudge.
- **Small moves are quiet:** a modulating valve dithers by fractions of a percent; its sound should be a short low "burr", not a full stroke. (The placeholder's `stepModulatingValve` has a stroke in seconds; the finished valve can share that logic with its own sound.)
- **Positioner:** if the finished valve is pneumatically positioned, its hiss of air on each move is the tell; electrically, the hum.

## What it needs in the game

- **Logic:** the existing `ModulatingValveState` (command, position, finite stroke, powered) is right; the finished valve binds its stem and its position indicator to `position`, and a positioner or motor hum to `valveError` (moving).
- **Look:** the globe body, the rising stem, the 0–100% travel scale, a positioner box where the command cable lands.
- **Sound:** a `gear-motor`-style hum while `valveError > 0`, quiet when at the command; a soft end stop only at 0% or 100%.
- **The model:** already there — `stepModulatingValve` moves the position toward the command over the stroke, holds without power.

The placeholder (`modulating-valve-placeholder.ts`) is a plain stand-in with the right behaviour; the finished globe valve replaces its geometry and adds the sound, as the plant's "a bit of everything" keeps the open/shut lever and quarter-turn valves for isolation beside it.
