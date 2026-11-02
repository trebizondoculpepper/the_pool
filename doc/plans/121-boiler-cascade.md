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
