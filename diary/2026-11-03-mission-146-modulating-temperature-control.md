# Mission 146: the ideal modulating temperature controller (2026-11-03)

The owner, late evening 2026-11-02 into the small hours, asked me to work autonomously through a job while they slept: write up "a project" (mission 146) and get started — wire in the model and test it works, then add and bind the visual elements, then research a valve designed for constant adjustment (all the game's current valves are open/shut), and get it done.

## Prototyping rooms (the owner, 2026-11-03, recorded)

- **Magic rooms prototype the visual appearance of a single object** — the cheap surface for seeing a component's design. Every real component with a standalone 3D form is registered in `MODELS` (`room-equipment.ts`) and reaches its magic room automatically through `adapterFor`/`fromModel`; no hand-written adapter, no side-channeling models into the world. The weather station alone keeps a curated `EXPLICIT` adapter, for its LOOK/PAGE selectors. (The two controllers were moved into `MODELS` from `EXPLICIT` to prove the rule.)
- **Dev rooms are interactive integration tests of features** — several machines working together, a full loop, real plumbing, a walk-in space — which a single-object magic room cannot show. Noted in `magic-room.ts`'s doc comment, `doc/agent-tooling.md`, and the mission 146 plan.

## Interface design via the face grid (the owner, 2026-11-03)

We re-laid the placeholder controller's fascia with a CSS-grid-like system, and the owner asked that the _process_ be recorded for future interface design.

- **Lay a face out with a grid, never by hand coordinates.** The reusable `face-grid` (`core/logic/face-grid.ts`, pure + tested) takes `rows`/`cols` (flex `1fr`-weights), a `pad`, a `gap`, and an `areas` template matrix; `cell(name)` returns each region's centred `{cx,cy,w,h}` in the face's metres (0,0 centre, +y up, row 0 the top). A component lives in a named region, so its bounds come from the grid and nothing can fall off the face.
- **Reuse repeating face components.** Parts (pots, selectors) and displays are dropped into regions; the LED-open bar is now the reusable `createLedBar` (`core/views/led-bar.ts`). A face composes named regions out of reusables instead of redrawing them.
- **Iterate against a toggleable debug overlay.** While laying a face out, switch its `gridOverlay` on (or call `setOverlay(true)`/`false`): each region's borders drawn thin, a reference label in each cell's top-right. When the layout is done, switch the overlay off for the shipped look (its current default).
- **Practical lessons from the controller's session:** a `createMicroLabel` is a plane centred on its position, so `align:'right'` alone does nothing unless you give it a `width` (a region-wide canvas) and centre the plane on the region — set `pad` to give the face breathing room from the case; align displays to the controls beneath them; and centre repeating controls on one line even when their part origins differ (measure the bounding box and nudge).

## What was written

- `doc/prompts/146-modulating-temperature-control.md` (the brief, recording every decision the owner made through the session) and `doc/plans/146-modulating-temperature-control.md`.
- `doc/research/modulating-control-valve.md` — what a modulating control valve is: a two-port globe control valve with a linear (rising-stem) actuator, after Siemens VVG41 with an SKD/SQX actuator (confirmed from the real datasheets; sources linked). The game's current valves are all open/shut (hand lever, quarter-turn actuated butterfly); the finished globe valve is the plant's first made for constant modulation, replacing the placeholder later.

## The model (wired and tested first, per the owner's order)

`src/toolkit/components/plant/logic/modulating-control.ts` (pure) + `modulating-control.test.ts`:

- The ideal controller: `ControllerModel` (measured, setpoint, band, output, mode), `command = clamp((set − measured)/band, 0, 1)`.
- The band dial is **1 to 10 kelvin, 1 aggressive** (`bandFromDial`); the owner's example (0.8 K under set at dial 4 → 20 %) is pinned in the tests.
- `stepController`: AUTO runs the law, HAND holds the output, OFF closes it.
- The modulating valve: command 0–1, a finite stroke (`stepModulatingValve`), holds its place unpowered — the open/closed games' valves don't do this.
- Also fixed the "valve firing constantly" note: it's `THERMAL.band = 0.1 K` (mission 144) acting as a relay; the ideal band (1–10 K) makes it genuinely proportional.
- 6 tests green.

## The visuals (bound)

- `views/temperature-controller-placeholder.ts` — same 430×290×150 body as the Water Margin; SET and ACTUAL red 7-segment LEDs, a BAND rotary dial (1–10), a HAND/OFF/AUTO rotary selector, and a 10-LED valve-open bar (the Soft Starter's pattern).
- `views/modulating-valve-placeholder.ts`, `views/thermal-probe-placeholder.ts` — working placeholders (a rising stem showing opening; a probe with `read()`), both real driven components.
- `views/modulating-control-trial.ts` — the loop: probe reads a fluctuating heat source, the controller holds its set point with its band, the valve moves over its stroke, its stem and LED bar show the opening. Registered as a dev65 exhibit.
- `modulating-control-trial.test.ts` verifies it builds and steps.

## The research

`doc/research/modulating-control-valve.md` (above), sources confirmed live.

## Checks

Typecheck, lint, format, build green. The full `npm test` shows 7 failures, all in plant_pool_01/02 temperature-controller mounting and world-in-model — from bala's uncommitted mission 144 refinements (`pool-temperature-controller.ts`, `room-equipment.ts`, `olympic-plumbing.ts`), not my files (none appear in those failing tests). Per AGENTS.md I don't fix another agent's in-flight work; the specific failures will clear when bala finishes.

## Still to do when the owner wakes

- The finished Water Margin TC-1 screen (`watershed-hmi.ts` is written, not yet wired to the controller body).
- The finished globe control valve and its sound.
- Fitting the controller and valve to plants 1 and 2 (the owner gave the plant-1 spot: x=4.78, y=−1.68, z=0.09, east wall).
- The ideal model's world binding (reserve a WORLD_VERSION first).

## Not pushed — why

The mission 146 work is complete and verified in the working tree (the owner sees it live on the shared dev server), but it is **not committed or pushed**. `boiler.ts` (which registers the dev65 trial) is entangled with bala's uncommitted mission 144 refinements (the controller cabinet) — committing it would carry his work or, split badly, break his in-flight edit. TODO.md and CHANGELOG.md likewise hold other agents' lines. The full `npm test` also has 7 failures from bala's uncommitted mission 144 work (plant_pool_01/02 controller mounting and world-in-model), not from my files. Rather than risk a messy push overnight, this is left for a coordinated commit when bala's 144 is merged: then move the trial registration out of the entangled hunk (or add it once boiler.ts is clean), stage only my hunks, and push via the private-index route.
