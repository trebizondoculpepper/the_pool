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
