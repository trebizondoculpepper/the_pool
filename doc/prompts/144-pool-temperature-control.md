# 144: Pool temperature control in plants 1 and 2: a controller and an LTHW control valve on each heat exchanger

The owner, 2026-11-02: plants 1 (the Lounge) and 2 (the Olympic) have nothing to regulate temperature; "we definitely need that. Probably a valve on the LTHW side to adjust the flow or isolate the heat exchanger." Brief only; not started until the owner says. `nicole_buruaah` wrote it (she built the LTHW ring, mission 120). Read `CLAUDE.md` (real working components; the model first, the schematic the one source of truth, the plumber; local controls; one world state; displays redraw only on change; the benchmark), `doc/plant-model.md`, `doc/room-layout-guide.md`, `doc/agent-tooling.md` and mission 120's plan (`doc/plans/120-heat-demand.md`) first.

## What there is now (checked 2026-11-02)

- **The heat is real, the control is invisible.** Each pool's water and hall air have a thermostat in the model (`src/game/plant/thermal.ts`: `thermostat()`, proportional over `THERMAL.band`, 0.1 K; the water's set point from `waterSet`, the world's `pool/setpoint` action). It decides how many kW the pool draws from the LTHW ring, as far as the ring can give it: `ringDraw(demand, k, flow, secondary)` in `src/game/plant/lthw-ring.ts`, `k` from `consumerK` so that at 80 °C flow the exchanger gives its full output.
- **Plant 1, the Lounge** (`src/game/plant/lounge-schematic.ts`): the filtered main runs through its plate heat exchanger in series (`exchanger`, `pool-in` → `pool-out`); the heating side is two plain links, 'Heating flow to the heat exchanger' and 'Heating return from the heat exchanger', to the heating main, with no valve, isolator or controller.
- **Plant 2, the Olympic** (`src/toolkit/gallery/logic/olympic-plan.ts`, `olympic-plumbing.ts`): a side-stream off the filter battery's outlet header through its shell-and-tube exchanger (`shell-tube-exchanger.ts`), forced by a hand-set regulating valve in the header (`battery.outlet.regulating`, a commissioning valve); the exchanger's thermostat pocket is drawn but empty; the heating side has no control valve or isolator.
- **Elsewhere:** the Jacuzzi's spa pack (`rooms/plant/spa-pack.ts`) already sets its pool's temperature through `pool/setpoint`; the bridge has its own pages. Nothing in plants 1 and 2 shows or sets temperature.

## What to build (normal UK practice for an indirect pool heat exchanger, about 2000)

For each of the Lounge's and the Olympic's pool-water exchangers:

1. **Isolating valves** on the LTHW flow and return at the exchanger (lever ball valves or, at the Olympic's size, gear-operated butterfly valves), normally open, each a schematic fitting with its function, normal state and derived tag, so the exchanger can be isolated for maintenance. A drain and vent on the exchanger's primary if normal practice has them.
2. **A motorised control valve on the LTHW side,** in the flow to the exchanger: a two-port modulating valve with its actuator (after a real product, e.g. a Siemens or Honeywell globe valve and actuator of the period), its position shown on the actuator's scale, and a manual override (a declutch and handwheel) for HAND. A three-port diverting valve, bypassing the exchanger on the LTHW side, is the alternative; choose by the research and record why. It is a schematic fitting too, placed by the plumber.
3. **A pool temperature controller,** a single-purpose instrument (the period rule: no screen does everything): a panel or wall controller after a real product (a 1/16 or 1/8 DIN PID controller with a red LED display, or a pool-heating controller of the period), showing the measured pool water temperature and its set point, with set-point keys, a heat-demand lamp and a valve-position or output bar; its sensor in the exchanger's return pocket (the Olympic's existing one) or on the pool return main. It drives the control valve. Mounted in the plant room by the exchanger or on its control panel; branded (`brands.ts`), its panel by Penfold if it is a panel.
4. **Local and remote** (the owner's rule, 2026-10-25): the set point and HAND/AUTO are local; the control room's water mimics may show the pool temperature, set point and valve position.

## The model

- **The valve decides the heat.** The exchanger's heat becomes the control valve's position times its full delivery: `k` scaled by the valve's opening (a linear or equal-percentage characteristic, recorded), zero with either isolating valve shut. The controller replaces the abstract water thermostat's role for these two pools: its PID output (or proportional, like the thermostat now) sets the valve's target; the actuator moves at a real stroke time (tens of seconds to a few minutes; game-paced if the owner agrees), so a change is seen happening.
- **One world state:** the controllers' set points, modes and outputs, the valves' positions and the isolators' states live in the world (`src/game/world.ts`), stepped while the player is elsewhere. Reserve the next `WORLD_VERSION` on the mailbox before taking it (75 on 2026-11-02), with a migration that starts old saves at today's behaviour (valves open, controllers in AUTO at the pools' current set points).
- **Faults it allows:** an isolator left shut, the control valve stuck or in HAND, a failed sensor reading low or high: each pool then drifts as the model says, and the controller and its lamps show it. Mission 140's diagnosis can then trace a heating fault through a real valve.
- **Kept green:** the new-game, gas-cut, cold-day and energy-balance tests of mission 120; a new game holds every pool at its set point as now.
- **Hall air:** the hall air's heating coils (in the air handling units) have the same need; out of scope here, noted in `TODO.md` as the next step.

## Order of work

1. **Research:** normal practice for an indirect pool heat exchanger's primary control (two-port versus three-port, valve sizing and authority, sensor position, controller type), and the products to model; recorded in `doc/research/pool-temperature-control.md`.
2. **The model:** the schematics gain the fittings (Lounge: `lounge-schematic.ts`; Olympic: its plan and plumbing), the pure valve-and-controller logic with tests, the world state and migration, `thermal.ts` and `lthw-ring.ts` taking the valve's opening.
3. **The kit:** the control valve and actuator, the isolating valves (existing valve components where they fit), the controller; each tried in dev0 (the controller) and a dev room (the valve set), benchmarked, then placed by the plumber and the layout in plants 1 and 2.
4. **The boards:** the plant rooms' and control room's water mimics show temperature, set point and valve position where they carry the pool's water; the bridge and 134/139's browser report pick the new facts up.
5. **Checks:** by look links and the room audit (129), every new fitting named, bound and working.

## Records

The plan in `doc/plans/144-pool-temperature-control.md`; the research note; the CHANGELOG under Unreleased (`### Added`, `### Changed`); `TODO.md`: this mission, and the hall air coils' control as the next item.
