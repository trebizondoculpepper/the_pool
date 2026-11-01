# 121: The boiler house's cascade, modelled

The owner, 2026-11-01: heat must be real, not faked. Mission 120 (`120-heat-demand-lthw-ring.md`) builds the LTHW ring and its consumers with a stand-in, capacity-limited supply; this mission replaces that stand-in with the boiler house itself: six boilers run by a cascade sequencer, in the world. It is a working model with a rough, functional control panel; its proper design (a 2010s cascade manager) is mission 122. The owner has put `nicole_buruaah` in charge of missions 120 to 122. Starts once mission 120 has merged.

Read `CLAUDE.md`, `doc/plant-model.md`, mission 120's brief and plan, and `doc/research/boiler-house-control.md` (`911c453a`, by `ahnaa_dmitrieva`): its §2 is what real plant does and §3 is the proposal this mission follows.

## What it replaces

- The boiler room's stand-in demand (`src/toolkit/gallery/rooms/plant/boiler.ts`, about line 188): `plant.boilersFiring && i < 5 && (i === 0 || Math.sin(t / 45) > 0)`. Boiler 1 follows a wave, boilers 2 to 5 switch together on a sine, boiler 6 never runs, and the return each boiler sees is a guess (`lthw − 14`).
- The screens' separate staging rule (`schematic-overviews.ts:213`, `ceil(demand / 250 kW)`) and `control-room-demo.ts`'s `boilersFiring` and LTHW wave.
- Mission 120's stand-in supply function.

## The model

- **The boilers in the world.** The six boilers' controllers (`boiler-house.ts`, `BoilerState`, kept as they are: codes, purge, ignition, run-on, lockout) move from the room's local `house` into the world state, so they run while the player is elsewhere. Keep `BoilerState`'s fields; `ahnaa_dmitrieva`'s boiler sounds key on them (code, lockout, rate, on, flow, return, timer, tries).
- **The sequencer** (`src/game/plant/boiler-sequencer.ts`, pure, tested): the research's §3.3. It reads the ring's header flow and return; holds a fixed primary set point (about 80 °C; no weather compensation on a pool primary); turns the header error into a total firing demand with a PI term; stages boilers in series (lead first) with a staging delay, minimum run and off times and differentials; rotates the lead by hours run; skips unavailable boilers (off, locked out, no gas, no combustion air) and promotes the next; releases all when no load calls; frost protection. Game-paced delays (tens of seconds, not minutes) as long as staging stays visible: one boiler lights, then another a while later, never several at once.
- **The heat:** each firing boiler's output (its rate × rated kW) is the supply into mission 120's ring. The plant should be N+1: full design load with one boiler out; check it and record it.
- **Readings:** `world-reading.ts`, the boiler room, the BH-MP2 mimic and its control-room copy, and the bridge all read the same world state: boilers called, firing and locked out, the lead, the demand, header flow and return.

## The rough control panel

A plain, working panel in the boiler house (a Penfold box is fine for now), enough to play: a PLANT ENABLE selector (OFF · AUTO · HAND), each boiler's CALLED, FIRING and LOCKOUT lamps and a LEAD lamp, the header flow, return and set point, the demand, and ACCEPT and RESET. Local only: the control room shows these and may START and STOP the plant in AUTO, nothing more. Mission 122 replaces this panel with the designed one.

## Alarms

Boiler lockout, header low, no boiler available: on the boiler house's mimic, the old control room's and the bridge's alarm lists, informational where routine.

## Coordination

`WORLD_VERSION` 72 is reserved for this mission. Mission 102 may land first at 73 with a placeholder `71: (world) => world` step; if so, replace that placeholder with this mission's real 71→72 migration and keep 102's 72→73. Two things have landed in `boiler.ts` since this brief was written: keep `sounder.show(BoilerState)` per boiler (`ahnaa_dmitrieva`'s boiler sounds, `e3f8272e`) and the read-only `boilerHouseShown()` export in `boiler.ts` (`3779da55`, the control room's copies) working when the boilers move into the world. Work in the main checkout, no worktree, private index, `--maxWorkers=2`.
