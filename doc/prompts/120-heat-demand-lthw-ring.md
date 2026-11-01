# 120: Real heat demand: the LTHW ring and its consumers

The owner, 2026-11-01: "everything is real … if we're faking heat demand, which is one of the most important game elements, we're basically cheating." Heat is modelled in two missions, of which this is the first: here the energy consumption, the hot ring and the plant rooms' draw on it; next, mission 121, the boiler house's cascade sequencer that supplies it. Read `CLAUDE.md` first: the model comes first, then plumbing, then the scene binds; one world state; displays redraw only on change.

## What is real today and what is faked

- **Real, the demand.** Each pool's water and hall air have a thermostat and heat-loss model (`src/game/plant/thermal.ts`, `stepThermal`; `HEAT[id]` design loads with warm-up headroom). Each step a pool works out the heat it wants, kW, from its evaporation, fabric losses, make-up water and ventilation: `pools[id].heating` (`pools.ts`, around line 699).
- **Faked, the supply.** The heaters are a bottomless source: if the room's "heat" service is available (`serviceAvailable(plant, room, 'heat')`, `heatingPlant` in `boiler-gas.ts`), they get what they ask for, at no temperature, from no boiler. Nothing is taken from a hot ring; the boilers cannot fall behind; a cold ring cannot starve a pool.
- **Faked, the display.** `world-reading.ts:119` sets `boilersFiring = heat > 1` and `lthw` to a hard-coded 80 or 70 °C (line 172). The boiler room's cascade (`rooms/plant/boiler.ts:188-196`) runs its lag boilers on `Math.sin(t / 45) > 0`, never boiler 6. The screens stage boilers by `ceil(demand / 250 kW)` (`schematic-overviews.ts:213`). Mission 121 replaces these; this mission gives them the real numbers to read.

## The model

1. **The LTHW ring** (one lumped circuit, world state):
   - state: the flow header temperature `T_flow`, °C (design about 80 °C), its thermal mass the ring's water (a few m³ of pipework, the boilers' and exchangers' water; choose and record a figure, so a time constant of minutes);
   - each step: `M·c·dT_flow/dt = Q_supply − ΣQ_consumers − Q_losses` (losses a small fixed UA to the plant room's air);
   - the return: `T_return = T_flow − ΣQ / (1.163 × ring flow, m³/h)`; the ring's circulating pumps give its flow (none with them stopped: no heat delivered, and the boilers' own flow switches matter in 121);
   - kW is already energy per second (kJ/s); work in kW and seconds throughout.
2. **Each consumer:** each plant room's pool heat exchanger (the Lounge, the Olympic, the Jacuzzi, the Footbath, as `HEAT[id]`'s water heaters) and each hall's air-handling heating coils (its air heaters). Each draws `Q_i = min(demand_i, k_i × max(0, T_flow − T_secondary_i))`, where `demand_i` is its thermostat's ask as today, `T_secondary_i` the water or air it heats, and `k_i` set so that at the design flow temperature it can deliver its design load with its existing warm-up headroom. With the ring hot every pool gets what it asks, as now (keep the existing tests green); with the ring cooling each gets less and drifts. `stepThermal` takes the delivered heat, not the asked; keep it pure.
3. **The supply, for this mission:** one capacity-limited source standing in for the cascade: up to the plant's total (the boiler house's boilers × their rated kW; read the real figures from `boiler-house-schematic.ts` / `boiler-house.ts`), modulating to hold `T_flow` at its set point, zero with the gas cut (`boilerGasOn`). Keep it behind one function so mission 121 can swap in the sequencer.
4. **Readings:** `world-reading.ts` reads the ring: `lthw` becomes `T_flow`, add `T_return` and the total demand and supply kW, and stop deriving `boilersFiring` from `heat > 1` (give it the source's firing state for now). Mimics and the bridge that show LTHW temperatures and heat then show real numbers. Don't redesign the boiler room here (that is 121), but if its cascade can read the real demand in place of `boilersFiring` and the sine, with a one-line change, note it for 121 rather than doing it.

## Gameplay it must produce (tests)

- A new game: the ring at its set point, every pool at temperature, its demand met (the new-game-normal test stays green).
- Gas cut (ECV or SSOV shut): `T_flow` falls over minutes, delivered heat falls with it, pools and halls drift down over hours; restoring gas recovers them.
- Demand above supply (a cold day, `ambient` low, all pools heating): the ring sags below set point and the pools share what there is.
- Ring pumps stopped: no heat delivered, even with the boilers able.
- Energy balance: over a long run, supplied heat = delivered + losses + the ring's stored change, to tolerance.

## World state, coordination

`WORLD_VERSION` 71 is reserved for this mission (announced 2026-11-01); add the ring's state with a migration that starts old saves at the ring's set point. 72 is reserved for mission 121. Work in the main checkout (no worktree), stage only your files through a private index, run `--maxWorkers=2`, and keep the shared checkout green between steps. Long simulations go in `*.slow.test.ts`.

## Records

The design and its figures in `doc/plans/120-heat-demand.md`; the CHANGELOG under Unreleased (`### Changed` or `### Fixed`); `TODO.md`: this mission, and mission 121 (the cascade sequencer) as the next item, with what it must replace (the sine, boiler 6, the hard-coded return, the screens' staging).
