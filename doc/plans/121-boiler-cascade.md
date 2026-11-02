# 121: The boiler cascade, modelled

The plan and the figures for [mission 121](../prompts/121-boiler-cascade-model.md): the six boilers and their sequencer in the world, replacing mission 120's stand-in supply. The figures follow `doc/research/boiler-house-control.md` §2 (real plant) and §3 (the proposal), game-paced; the owner may overrule them. They are named constants in `SEQUENCER` (`src/game/plant/boiler-sequencer.ts`).

## The sequencer (`boiler-sequencer.ts`, stage 1)

A pure block: `stepBoilerSequencer(state, inputs, dt)`. It reads the common flow header, the outside air, whether any load calls, and each boiler's availability, flame and lockout; it gives each boiler a call and a firing-rate target (`sequencerTargets`).

| Figure            | Value                                                                                    | Real plant (research §2)                         |
| ----------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Set point         | 80 °C, fixed                                                                             | A pool primary at a fixed set point (§2.2)       |
| PI term           | Kp 0.1 of the plant per K, Ti 480 s                                                      | An integral or PID term on the header error      |
| Minimum fire      | 20 % (5:1 turndown)                                                                      | 20 to 100 % on a 300 kW condensing boiler (§2.3) |
| Stage up          | all called proven and ≥ 95 %, header 0.5 K low, for 30 s                                 | lead near full fire 2 to 10 min                  |
| Stage down        | the last at minimum fire, header 1 K high, for 60 s                                      | at low fire for a delay                          |
| Staging interval  | 45 s between successive changes                                                          | a staging interval                               |
| Minimum run / off | 120 s / 60 s per boiler                                                                  | minimum run and off times (§2.5)                 |
| Rotation          | every 6 world hours, to the available boiler with fewest hours run; or fixed             | round robin by hours run (§2.4)                  |
| Frost             | pumps below 3 °C outside; the lead at minimum fire below 5 °C at the header, until 10 °C | §2.7                                             |
| HEADER LOW        | 10 K under the set point while heat is wanted                                            | the sequencer's header low alarm                 |

The PI loop: the ring holds 20,950 kJ/K and the plant gives 1,800 kW, so the header moves 0.086 K/s per unit of demand; Kp 0.1 gives a closed loop of about two minutes, and Ti four times that. The integral is held within the boilers called (anti-windup), so the plant at full fire with the header short is what calls the next boiler.

Series (lead/lag) staging: the demand is filled in rota order from the lead, each called boiler at least at its minimum fire. Below one boiler's minimum fire the lead sits at 20 %, the header rises past its set point plus the differential, and after the stage-down delay and its minimum run the lead is released; once the header falls half a degree under, it is called again after its minimum off. It cycles.

The lead: an unavailable one (switched off, locked out, without gas, power, combustion air or flow) is skipped and the next in the rota promoted at once; a called boiler that becomes unavailable is released at once. With no load calling, all are released and the PI term with them.

PLANT ENABLE (OFF · AUTO · HAND) is the boiler house's, local. In AUTO the plant runs while the control room has it started (START and STOP) and a load calls; in HAND it runs regardless; OFF leaves only frost protection.

The alarms (lockout, header low, none available) are its lamps: new ones flash, ACCEPT holds them steady while they are in, and they go dark once cleared and accepted.

### Its state, for mission 122

`BoilerSequencerState` in `src/game/plant/boiler-sequencer.ts`: `enable`, `run`, `setpoint`, `rotation`, `lead`, `called` (in rota order), `demand`, `integral`, `stageTimer`, `upTimer`, `downTimer`, per boiler `sinceChange`, `hoursRun`, `starts`, then `sinceRotation`, `wanted`, `frost`, `frostPumps` and `alarms`.

## The boilers in the world (`boiler-plant.ts`, stage 2)

`world.boilerHouse` holds the six boilers' controllers (`BoilerState`, as before: codes, purge, ignition, run-on, lockouts), the combustion air and flues (`CombustionState`), and the sequencer. They step with the LTHW ring second by second (`stepRing`'s `supply` and `maxStep: 1`): the sequencer reads the header, each boiler steps with its call and its firing-rate target, and the firing boilers' outputs (rate × 300 kW) are the ring's supply. That replaces mission 120's stand-in (`ringSupply`, `supplyCapacity`, `lthw.boilers` and the `lthw/boilers` action); the ring's energy balance holds as before.

- **Remote modulation.** A boiler given a `modulation` target (its 0–10 V power-control input) fires to it in AUTO, at least at its 20 % minimum fire, in place of its own flow control. Its forced HIGH and LOW still override, and its 95 °C overheat lockout still trips.
- **Its water.** The ring's 80 m³/h passes through the firing boilers, shared between them, so each sees the common return and a rise of its output over its share of the flow. With all firing at one rate their flow is the header's, never near the overheat trip.
- **Availability.** A boiler is available when it is on, not locked out or blocked, has gas (street, ECV and SSOV), power and flow, and the combustion air is proven. With the gas cut the sequencer releases every boiler at once, so none tries to light without gas and none locks out; their displays say GAS. With the gas back (GAS RESET) the lead lights first, then one more every 45 s.
- **A new game.** B-501 leads at a quarter fire: a new game's pools start at temperature, so the load starts at some 70 kW and climbs towards 424 kW over the hour, when B-502 joins it. The hours run are spread (B-501 4,210 h, B-502 4,380, B-503 4,450, B-504 4,300, B-505 4,520, B-506 4,290), so the lead rotates to B-506, then B-504, as hours build.
- **Actions.** One `boiler-house` action: a boiler's keys and set point; PLANT ENABLE; START and STOP (AUTO only); ACCEPT; RESET (every locked-out boiler); the lead and rotation; the combustion panel's fan and RESET.
- **Health.** Each boiler on and not locked out, and the plant in AUTO and started.
- **Migration.** `WORLD_VERSION` stays at 74. The 71 → 72 step brings in the boiler house as a new game has it, and switches off any boiler the old in-service count left out.

**N+1** (`boiler-plant.slow.test.ts`): on a design day (−3 °C) with B-501 switched off, a day on, the 754 kW load is met by three boilers and the header is at 80.1 °C. Five boilers give 1,500 kW, so a full design load is met with one boiler out. A cold restart with every heater flat out asks 1,606 kW, more than five boilers give, and the ring sags: that is mission 120's shortfall test, which now switches B-506 off in place of the stand-in count.

**From cold**, after eight hours without gas on a design day, the boilers light 0, 45, 90, 135, 180 and 225 s after GAS RESET: one at a time, never two in one step.

**Mission 120's tests** hold. The new-game and design-day flow tolerances widen from 0.05 to 0.5 K, and the readings' and energy mimic's 600 s checks to within 1 K: a PI cascade tracks the loads' drift within about 0.1 K, and while the lead is at full fire the header sits up to its 0.5 K stage-up differential under the set point until the next boiler lights.

## The boiler room reads the world (stage 3)

`rooms/plant/boiler.ts` no longer holds the boilers: their panels, sounds (`sounder.show(BoilerState)` per boiler, every frame), inspection statuses, the gas mimic, the BH-MP2 mimic and the combustion panel all read `world.boilerHouse`, and their keys, set points, fan selector and RESET dispatch `boiler-house` actions. The stand-in sine, `plant.boilersFiring` and the guessed `lthw − 14` return are gone: each boiler fires as the sequencer calls it, and B-506 fires like the rest. `boilerHouseShown()` stays, read only, for the control room's copies, returning the world's boilers and a gas house rebuilt only when the world's gas safety changes (so its copies redraw only on a change, mission 094). Where there is no world (no page), the room steps its own boiler house on the plant's reading, as the world would.

### The operator's settings (for mission 122)

The set point, the stage-up and stage-down delays and each boiler's minimum run are world state (`setpoint`, `stageUp`, `stageDown`, `minRun` in `BoilerSequencerState`), set with one action, `{ type: 'boiler-house', action: { act: 'setting', setting, value } }`, held within the CM6's limits (`SEQUENCER_SETTINGS`: set point 50–85 °C in 1 K steps, stage up and down 30–900 s and minimum run 60–1200 s in 30 s steps). The lead (`act: 'lead'`), rotation (`act: 'rotation'`, hours or fixed), PLANT ENABLE (`act: 'enable'`) and START/STOP (`act: 'run'`, AUTO only) have their own. The staging interval (45 s), minimum off (60 s), differentials, minimum fire and the PI gains stay constants in `SEQUENCER`. A save from between stages 2 and 3, which lacks the new fields, takes their defaults (`fillDefaults`).

## The readings, the screens and the boards (stage 4)

- **The reading** (`world-reading.ts`): `boilersFiring` is any boiler's flame proven, and a new optional `boilers` gives each one firing and locked out. The heating mimic (CR-MP2) lights B1 and B2 from them and reads the ring's return (`lthwReturn`) in place of `lthw − 14` and `lthw − 11`.
- **The screens** (`schematic-overviews.ts`, `station-schematics.ts`): the staging rule (`ceil(demand / 250 kW)`) is gone. Each boiler shows as the world has it (firing, locked out, or not), the heating ring's HEAT DEMAND is the ring's loads' demand, its RETURN the ring's, and the gas train's m³/h the boilers' supply (`ringGasM3h`). The bridge's BOILER CASCADE grid gives each boiler's place in the rota (LEAD, then 2 to 6) and its state: FIRING, CALLED, LOCKOUT, STANDBY or OFF.
- **BH-MP2** (`boiler-heat-mimic.ts`), in the boiler house and its control-room copy (CR-MP7): each boiler's CALLED, READY, FIRE, LOCKOUT and LEAD lamps and its output; the header's FLOW and RETURN, the set point, the total and the plant's DEMAND in LED digits; the BOILER LOCKOUT, HEADER LOW and NO BOILER AVAILABLE lamps; PLANT ENABLE's OFF, AUTO and HAND lamps and RUN. Both read the world. The copy redraws only when the world's boiler house or ring changes.
- **The bridge**: BH-MP2's page (HEAT OUTPUT · WARP FACTOR) is wired: each boiler's four lamps, the header, set point, demand and output, the alarm and PLANT ENABLED lamps, and PLANT START and STOP, which work in AUTO and are refused, as local, otherwise.

## The rough panel and the alarms (stage 5)

The rough panel is BH-MP2 itself in the boiler house (`BOILER_HEAT_PANEL`), so it needs no new installed asset. PLANT ENABLE is three push buttons, OFF, AUTO and HAND, with the lit lamp over them showing its position. ACCEPT accepts the sequencer's alarms, and RESET resets every locked-out boiler. All of these are local only. The control room's copy (`BOILER_HEAT_COPY`, CR-MP7) carries START and STOP, which work in AUTO only, and nothing more. Mission 122's CM6 replaces this panel.

The alarms:

- **BOILER LOCKOUT**, the main annunciator's window, now lights for any boiler locked out as well as for the SSOV shut. It is in the old control room, on the bridge's alarm list and on BH-MP2.
- **HEADER LOW** takes the main annunciator's spare way ("LTHW FLOW TEMP LOW", to the boiler room). It lights while heat is wanted and the header is 10 K under its set point, and shows on BH-MP2 and the bridge.
- **NO BOILER AVAILABLE** is on BH-MP2's lamp and the bridge's alarm list.
- **BOILER PLANT OFF (INFO)** is on the bridge's list, for information only: the plant is left off or stopped, which is routine.

With no load calling, the plant is released after a 60 s overrun (`loadOverrun`), so a new game's first moment, before any load calls, does not stop B-501.
