# 120: Real heat demand, the LTHW ring and its consumers

The plan and the figures for [mission 120](../prompts/120-heat-demand-lthw-ring.md). The owner, 2026-11-01: "if we're faking heat demand, which is one of the most important game elements, we're basically cheating." Before this mission the pools' heaters drew from a bottomless source whenever the heat service was on; now every kilowatt they take comes out of the LTHW ring, which the boilers must keep hot.

The figures are normal practice as `doc/research/heat-demand.md` (`753d17d4`) recommends in its section 9, adopted by the coordinator on 2026-11-01; the owner may overrule them. They are named constants in three places: `RING` in `src/game/plant/lthw-ring.ts`, `POOL_HEATERS` in `src/game/plant/pools.ts`, and `AREAS` and its constants in `src/game/plant/heat-consumers.ts`. Every consumer is sized at one design outside temperature, −3 °C (CIBSE Guide A, southern England). The world's actual outside temperature (`AMBIENT`, 12 °C, and the weather) is unchanged.

## The model

### The ring (`lthw-ring.ts`)

The ring is one lumped circuit: the boilers' water, the low-loss header's, the pipework's and the exchangers' primaries make one body at the flow header temperature `T_flow`.

`M·c·dT_flow/dt = Q_supply − ΣQ_consumers − Q_losses`, integrated in sub-steps of at most 5 s. A kW is a kJ/s, so the model works in kW, kJ/K and seconds throughout.

| Figure       | Value                                    | Source                                                                                                                                                                             |
| ------------ | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Set point    | 80 °C, fixed                             | Research §2. A pool plant's primary runs at a fixed set point, with compensated radiator circuits downstream on their own valves (boiler-house-control §2.2).                      |
| Design drop  | 20 K (80/60 °C)                          | Research §2: condensing practice.                                                                                                                                                  |
| Water volume | 5 m³ (2.8 l/kW), so M·c = 20,950 kJ/K    | Research §2, bottom-up: boilers 0.2–0.4 m³, low-loss header 0.3–0.5 m³, 300 m of DN100–150 pipe 3–4 m³, exchangers 0.5–1 m³. The 10–12 l/kW rule of thumb is for radiator systems. |
| Circulation  | 80 m³/h                                  | Research §2: 1,800 kW at a 20 K drop is 77 m³/h, about 1.2 m/s in DN150.                                                                                                           |
| Losses       | UA 0.3 kW/K to the boiler house at 20 °C | Research §2 (BS 5422, CTG009): about 18 kW, 1–3 % of the annual heat.                                                                                                              |
| Return       | `T_flow − ΣQ / (1.163 × 80)`             | With the pumps stopped there is no flow, so the return is the flow.                                                                                                                |

### The consumers (`heat-consumers.ts`, `thermal.ts`, `pools.ts`)

Each consumer draws `Q_i = min(demand_i, k_i × max(0, T_flow − T_secondary_i))`: what its own thermostat and control valve ask, as far as the ring is hot enough to give it. The consumers don't talk to the boilers; the boilers see only the header sag (research §2.8 of boiler-house-control). Each heater's full output is now set as normal practice selects it (`POOL_HEATERS`, `AREAS`), no longer as 2.5 times a 12 °C mean load. Its `k = output / (80 − T_secondary at design)`, so a hot ring gives every heater its full output at design, and gives every pool what it asks.

| Consumer                 | Full output, kW  | Secondary, °C | k, kW/K | Source                                                                                                                                                                                     |
| ------------------------ | ---------------- | ------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Lounge water (pool_01)   | 80               | 30            | 1.60    | Research §3: 0.5 K/h (CTG009). Was 57.                                                                                                                                                     |
| Lounge hall air          | 75               | 31            | 1.53    | Research §4: 65–80 kW at design. Was 63.                                                                                                                                                   |
| Olympic water (pool_02)  | 750              | 28            | 14.4    | Research §3: a cold fill at the 0.25 K/h structural limit (CTG009), 727 kW. Was 293.                                                                                                       |
| Olympic hall air         | 450              | 29            | 8.82    | Research §4: 240–550 kW at design; kept.                                                                                                                                                   |
| Jacuzzi water (pool_03)  | 12               | 37            | 0.28    | Research §3: a fill reheated within a shift. Was 4.2.                                                                                                                                      |
| Jacuzzi room air         | 13               | 30            | 0.26    | Kept.                                                                                                                                                                                      |
| Footbath water (pool_04) | 5                | 34            | 0.11    | Research §3. Was 2.5.                                                                                                                                                                      |
| Footbath passage air     | 2.5              | 28            | 0.05    | Kept.                                                                                                                                                                                      |
| Museum                   | 219 (182 design) | 20            | 3.65    | Research §6: 60 W/m² at −3/20 °C, 1.2 × headroom.                                                                                                                                          |
| Reception                | 0 until built    | 20            | 0       | Research §7: 70 W/m², 1.2 × headroom.                                                                                                                                                      |
| Changing                 | 0 until built    | 24            | 0       | Research §7: 110 W/m² (ten air changes through a recuperator).                                                                                                                             |
| DHW                      | 0 until built    | 60            | 0       | Research §5: a 4,000 l store at 60 °C, 250 kW recovery (k 12.5 kW/K), about 1 kWh a bather. With the ring below about 70 °C it can't reach 60 °C, so a Legionella warning is needed later. |

The other areas are one list, `AREAS`. Each is a single body (its air and fabric) with a design heat loss in W/m² of floor at −3 °C, a proportional thermostat (band 0.5 K), heaters at 1.2 × design for warm-up, and a heat capacity per m² of floor. A new area is one more entry; nothing else names the set. A saved world without the area starts it at its set point, and the energy mimic gives it a row.

- **The museum:** its ten halls' floor, taken from `museum-layout.ts`, is 3,038 m². At 60 W/m² that is 182 kW design and UA 7.9 kW/K. It's held at 20 °C, with 200 kJ/K per m² (ISO 13790, medium to heavy), a time constant of about 21 hours. It takes about 63 kW at the usual 12 °C outside and 179 kW on a design day.
- **Reception and changing:** not built, so no floor and no load. Their W/m² and set points are in their entries.
- **DHW** (the changing area's showers' calorifiers): not built, so no load. Its figures are in `DHW`, and it has a row on the energy mimic.

### The supply (`supplyCapacity`, `ringSupply`)

The supply is a capacity-limited stand-in for the cascade: up to its boilers in service × 300 kW (B-501 to B-506, the HW 300s). It gives nothing with the ECV or SSOV shut (`boilerGasOn`), the heat source off, the boiler house unpowered, or the ring's pumps stopped (the boilers' flow switches). It modulates to hold the set point: `Q = load + M·c·(80 − T_flow) / 120 s`, clamped to its capacity, so it gives exactly its load at the set point and closes a gap over two minutes. `ringSupply` is the one function mission 121 swaps for its sequencer. The boilers in service are a world figure (`lthw.boilers`, the `lthw/boilers` action), standing in until 121 brings the six boilers' own states into the world.

**N+1 check** (research §8). Six boilers at 300 kW give 1,800 kW, and five (one out) give 1,500 kW. On a design day (−3 °C) the built consumers' steady demand is 754 kW, within N+1 with about half to spare for warm-ups. With every heater flat out they ask 1,606 kW today, about 1,950 kW once reception, changing and DHW are built. That's more than N+1's 1,500 kW, so a cold restart on a design day with a boiler out makes the ring sag. That is realistic (operators avoid it), and it is the shortfall test.

### The world (`world.ts`, `save.ts`)

`world.lthw` (WORLD_VERSION 71) holds:

- the flow and return temperatures;
- whether the pumps are switched to run, and the boilers in service;
- the last step's mean supply, demand, delivered heat and losses, and whether the supply fires;
- each consumer's draw (`pool_01/water`, `pool_01/air`, …, `museum`, `reception`, `changing`, `dhw`);
- the areas' temperatures.

Old saves get it at its set point. Each step, the pools draw at the step's starting `T_flow` (`stepPoolsWater`'s `ring`) and the areas likewise (`stepAreas`), then the ring steps with their draws held through the step. The gas cut no longer switches the rooms' heat service off (`heatingPlant` is retired); instead the ring cools as the loads draw on it. The gas meter reads the supply (`ringGasM3h`, 10.55 kWh/m³ at 90 %). There are two new actions, `lthw/pumps` and `lthw/boilers`.

### The readings (`world-reading.ts`)

`lthw` is now `T_flow`. `lthwReturn`, `heatDemand` and `heatSupply` are new; they are optional in `PlantReading`, since the scripted loop doesn't give them. `boilersFiring` is the supply's firing state, and the boilers' current is 3 A standing plus up to 15 A with the supply. Every mimic and bridge page that reads `lthw` now shows the ring.

## What it does (`lthw-ring.slow.test.ts`)

- **New game:** after an hour, the ring is at 80.0 °C with its return at 75.6 °C, and supplies 424 kW: 406 kW delivered (everything asked) plus 18 kW lost. Every pool is at temperature and the museum at 19.9 °C. By facility: Lounge 24 kW water + 25 kW air, Olympic 112 + 179, Jacuzzi 1.7 + 5.1, Footbath 1.0 + 1.0, museum 58, reception, changing and DHW 0.
- **Design day** (−3 °C, after a day to settle): 754 kW asked and delivered (Olympic 136 + 333, Lounge 49 + 44, museum 179), return 71.9 °C, every pool at temperature.
- **Gas cut on a design day:** the ring falls 2.2 K in the first minute (about 750 kW against 20,950 kJ/K), 11 K in five minutes and 21 K in ten. It's at 50.5 °C after a quarter of an hour and 35 °C after half an hour. The loads get all they ask for roughly the first five to ten minutes.
- **Gas cut on a 12 °C day:** 1.2 K in the first minute, 6 K in five, 12 K in ten, 44 °C at half an hour, 29 °C at an hour. After six hours the ring is at 19 °C:

  | Body     | Before, °C | After 6 h, °C |
  | -------- | ---------- | ------------- |
  | Lounge   | 30.0       | 28.9          |
  | Olympic  | 28.0       | 27.7          |
  | Jacuzzi  | 37.0       | 34.0          |
  | Footbath | 34.0       | 28.7          |
  | Museum   | 19.9       | 18.4          |

  The halls are 6–8 K down. With the gas back (ECV open and GAS RESET), the boilers fire at the full 1,800 kW against 1,606 kW asked: the ring is back to 79.4 °C in half an hour, and the pools are back within twelve hours.

- **Demand above supply:** a design day, eight hours without gas, then five boilers: 1,606 kW asked against 1,500 kW. The ring sags to 71–72 °C with its return at 56 °C. The Olympic's exchanger gets 644 of its 750 kW and its coils their full 450; the museum gets 212 of 219. With all six boilers back the ring is at its set point within half an hour.
- **Pumps stopped:** nothing is delivered and nothing supplied, though gas and power are there.
- **Energy balance:** over a twenty-hour day with a gas cut, a cold spell and the pumps stopped for half an hour, 11,225.6 kWh supplied = 10,904.3 delivered + 321.3 lost + 0.000 stored, to within 1 × 10⁻⁶ kJ.

## The energy mimic (`energy-mimic.ts`)

The energy mimic is a Penfold board, 2.4 × 1.2 m, titled `HEAT ENERGY BY FACILITY`:

- the boilers on the left, with FIRING and PUMPS lamps, the supply's kW, and the ring's flow and return;
- the flow and return headers down the board;
- one row per facility, built from the consumer list (the four pools, then every `AREAS` entry, so a new area adds a row). Each row has a lamp while it draws, its total kW and its share of the total; a pool's row also shows its water and air kW;
- the total at the foot.

Its digits sample the ring every 2 s of world time (as kW transducers refresh) and redraw only when a rounded value changes. It was tried in dev39 and is installed as CR-MP10 (`mimic-energy`, `asset-1305`) in the old control room's upper row: on the east wall, centred 1.3 m south of the middle, its bottom 2.8 m up, 2.5 × 1.3 m in its frame, in the span `ahnaa_dmitrieva` kept for it. It's a node of the control room's schematic and is listed on the bridge as HEAT ENERGY: a panel with the facilities' kW, the ring's flow, return, supply and total, and the FIRING and PUMPS lamps. On the component bench (fresh runs), both the dev39 exhibit and the installed board upload nothing idle or running.

## Left for mission 121

- The boiler room's cascade (`rooms/plant/boiler.ts`, about line 188) still runs on `plant.boilersFiring` and `Math.sin(t / 45)`, and boiler 6 never fires. It could read the real demand with a one-line change: its `demand` could be `plant.heatSupply > i * 300` (the supply staged across the boilers) or, better, the sequencer's calls. Noted, not done.
- `systemReturn: plant.lthw - 14` in the same call, and the mimics' hard-coded `lthw − 11` and `lthw − 14` returns (`pool-mimics.ts`, `schematic-overviews.ts`), can read `lthwReturn`.
- The screens' staging (`schematic-overviews.ts`, `boilersFiring`: `ceil(demand / 250 kW)`) and `heatDemand` there (the pools' delivered heat) can read the ring's supply and demand, and its gas figure (`siteGasM3h`) the supply.
- The stand-in `lthw.boilers` count goes once the boilers' own states are in the world, and the supply's flow-switch condition becomes each boiler's own.
- The supply fires at any load, down to nothing. Real boilers have a minimum fire (20 % of 300 kW) and cycle below it.
