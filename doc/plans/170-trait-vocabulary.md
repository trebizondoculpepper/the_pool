# 170 — Trait vocabulary proposal (audit pass 2, phase 1)

The owner, 2026-11-04. Surveyed all **108 registered kinds** from the CLI (`kinds`, the `defineKind` files' type/class/status, placements and builders). This file is the **proposal**: composite traits, each with its members and why; none are applied to kinds here — that is mission 176. The trait primitives are 172's (`npm run -s audit -- traits`): box-like, cylindrical, panel-like, run-like; supportable, walkable; floor-standing, wall-mounted, ceiling-mounted; in-line, terminal; fixed, holdable, luggable; operable, readable, sittable; container; decorative; services (derived, never set).

The engineers' office's kinds are the worked examples (170): desk box-like+operable; storage cupboard box-like+operable; chair chair-like(sittable)+luggable; software box box-like+portable(holdable); noticeboard panel-like. (`floppy-disk` was pre-approved by the owner on 2026-11-04 as `panel-like + holdable + readable` and already applied.)

## Proposed composite traits

Composites bundle a form, a support, a handling, a use and, where they hold, a role. Metadata defaults follow (a floor-standing kind's floor is its local y=0, etc.) and are only set where a kind differs.

### tank-like

> A closed vessel holding water or chemicals, standing on the floor, its roof possibly walkable; nothing moves on it.

extends: **box-like, floor-standing, fixed, container** (+ `walkable` for those with a walkable roof, proposal 151).

kinds: `acid-ibc`, `backwash-tank`, `balance-tank`, `break-tank`, `calorifier`, `chem-bulk`, `chem-day`, `contact-tank`, `dosing-pot`, `hypo-tank`, `low-loss-header`.
walkable-roof members (validate in 176): `balance-tank`, `break-tank`, `backwash-tank`.

### machine-like

> A rotating or packaged machine — a pump, a booster, a treatment unit — stood on the floor, driven, its controls worked.

extends: **box-like, floor-standing, fixed, operable**.

kinds: `acid-pump`, `booster-set`, `chem-pump`, `dosing-set`, `hypo-pumps`, `jacuzzi-pack`, `lthw-pumps`, `ozone-generator`, `pressurisation`, `pump`, `pump-pair`, `spa-pack`.

### heat-like

> The boiler house's boiler plant and its heat exchange.

extends: **box-like, floor-standing, fixed, operable**.

kinds: `boiler`, `boiler-cascade`, `heat-exchanger`.

### filter-like

> Filtration and disinfection plant: sand and cartridge filters, the UV unit — cylindrical vessels stood on the floor.

extends: **cylindrical, floor-standing, fixed, operable**.

kinds: `cartridge-filter`, `sand-filter`, `uv-unit` (+ `walkable`/connector metadata where the filter vessels are climbed).

### valve-like

> A valve or isolating fitting in a line: turned or actuated, closing the run.

extends: **cylindrical, in-line, fixed, operable**.

kinds: `butterfly-valve`, `changeover-switch`, `chem-selector`, `gas-ball-valve`, `penstock`, `rotary-isolators`, `valve`, `co2-wall-inlet`, `co2-wall-port`, `co2-master` (its manifold), `earthing-terminal` (terminal, fixed; readable).

### run-like

> A pipe, cable or duct: walk-through, not solid.

extends: **run-like** (primitive; no bundle worth naming).

kinds: `pipework`, `plant-room` (a space drawn as a run? — propose run-like until placed; revisit in 176).

### instrument-like

> A measuring instrument, usually in or on a line, read not worked.

extends: **box-like/cylindrical, in-line or terminal, fixed, readable**.

kinds: `flowmeter`, `level-transmitter`, `make-up-flowmeter`, `make-up-recorder`, `ozone-monitor`, `sewer-monitor`, `temperature-sensor`, `water-meter`.

### panel-like (read-only boards)

> A thin wall panel read or watched: a mimic, an annunciator, a monitor.

extends: **panel-like, wall-mounted, fixed, readable**.

kinds: `alarm-printer`, `annunciator`, `bms-outstation`, `cctv`, `chart-recorders`, `fire-repeater`, `mimic-air`, `mimic-boiler-heat`, `mimic-energy`, `mimic-gas`, `mimic-heating`, `mimic-jacuzzi`, `mimic-lounge-filter`, `mimic-pool`, `mimic-wet`, `mimic-wet-dirty`, `mimic-wet-fresh`, `operator-desk` (desk with screens), `readout-board`, `weather-station`.

### control-panel-like

> A panel or board with working controls — switches, lamps, pushbuttons.

extends: **box-like or panel-like, fixed, operable**.

kinds: `balance-tank-panel`, `cabinet-switch`, `cascade-manager`, `central-battery`, `chem-control-box`, `chem-terminal`, `combustion-panel`, `co2-panel`, `dosing-controller`, `fill-cabinet` (a filling cabinet, box-like + supportable + operable), `gas-safety`, `generator-point`, `lighting-board`, `main-switch`, `pool-temperature-controller` (the designed Water Margin controller, a working panel), `pump-panel`, `switch-fuse`, `distribution-board`, `lv-switchboard`, `mcc`.

### gas-train-like

> The gas supply's train and safety.

extends: **run-like/in-line, fixed** (+ `readable` on the safety panel).

kinds: `gas-train`, `co2-detector`.

### duct-air-like

> The air handling and extract units.

extends: **box-like, floor-standing/wall-mounted, fixed, operable**.

kinds: `ahu-stack`, `store-extract`.

### office-furniture-like

> A room's furniture: a desk, cupboard, cabinet; holds or stores, worked, some portable.

extends: **box-like, floor-standing, fixed** (+ `supportable` for a desk's top, `operable` for cupboards' doors, `holdable`/`luggable` for the portable ones as listed separately).

kinds: `desk` (box-like + supportable + operable — override its `decorative` class per 170's worked example), `filing`, `operator-desk` (see panel-like), `ppe-cabinet`, `storage-cupboard` (box-like + supportable + operable), `tanker-stand` (floor-standing; holds a tanker).

### seat-like

> Something to sit on.

extends: **box-like, floor-standing, sittable, luggable**.

kinds: (the desk's chair, `office-chair`, when registered — 169's 13 bindings).

### holdable-small

> A small thing picked up and carried: a box, a disk, a kit.

extends: **box-like or panel-like, holdable**.

kinds: `software-box` (box-like + holdable), `floppy-disk` (panel-like + holdable + readable — owner-approved), `water-test-kit` (box-like + holdable), `spill-kit` (box-like + holdable), `sign` (panel-like, wall-mounted, readable; or holdable where portable).

### wash-down-like

> A safety wash point: an eye and body shower fixed in place, pulled to work.

extends: **box-like, floor-standing or wall-mounted, fixed, operable**.

kinds: `safety-shower`.

### decorative

> Deliberately inert: seen, nothing else. Never with operable, chair-like, portable or luggable.

kinds (class `decorative`): `desk` **unless** reclassified per 170's worked example, `filing`, `fire-point`, `storage-cupboard` **unless** operable per the worked example, `store-signs`. `store-signs` and `fire-point` stay decorative; `desk`/`storage-cupboard` are proposed operable per 170 and should be re-classed in 176.

## No proposal covers yet (primitives only, or to be decided in 176)

- `boiler-cascade` and `heat-exchanger` under heat-like; `low-loss-header` under tank-like (vessel) — confirmed.
- `scenario-simulator`, `sewer-monitor` (instrument-like/readable) — confirm placement.
- `plant-room`: a room, not an object the walker can meet — propose run-like (walk-through) until placement rules exist.

## Consistency notes (from 170's rules, to be turned into tested rules in 176)

- `desk` / `storage-cupboard` are currently `class: decorative` but the worked examples call them operable: resolve the class/traits conflict in 176 (decorative never with operable).
- `store-signs` is decorative (a sign one only sees) — keep.
- Each proposed composite's primitives must satisfy 170's consistency rules (portable/holdable never with luggable; decorative never with operable/holdable/luggable/sittable).
