# Boiler house control: what regulates the LTHW loop

The owner, 2026-11-01: "Can you do some research on what would normally control the boiler? I think there would be a system that tries to regulate the temperature of the hot-water loop. It would do this by setting the temperature of the boilers, and extinguishing surplus boilers, possibly on a round-robin rota." And on sounds: "When they are starting up they need a pump noise, and then an additional noise when the flame is starting, usually a tick tick of the sparker before the flame ignites, and then when the burner goes off, the pump runs for a short while longer before it stops and the machine goes silent."

Research only: no code is changed by this note.

## Contents

1. What the game does today
2. What real plant does
3. A proposal for the game
4. Boiler sounds
5. Sources

## 1. What the game does today

The boiler house holds six condensing boilers (`src/toolkit/gallery/rooms/plant/boiler.ts`, `house.boilers`), each with a full controller of its own (`src/toolkit/components/plant/logic/boiler-house.ts`: codes 0 standby, 1 purging, 2 igniting, 3 firing, 7 pump run-on, 9 blocked; `PURGE_SECONDS` 6, `IGNITION_SECONDS` 4, `RUN_ON_SECONDS` 20, `MAX_TRIES` 3, lockouts for ignition failure, flame loss and overheat). What is missing is the thing above them. Each boiler's demand is a stand-in timer: `plant.boilersFiring && i < 5 && (i === 0 || Math.sin(t / 45) > 0)`, where `plant.boilersFiring` is `wave(90) > -0.3` (`src/toolkit/gallery/logic/control-room-demo.ts`, about line 201). So boiler 1 cycles on a 90 s wave and boilers 2 to 5 switch on and off together on a 45 s sine; boiler 6 never runs. Nothing in it looks at a temperature. The world's heating is only a `heat` service on or off (`src/game/plant/boiler-gas.ts`, `heatingPlant`). The single-boiler block in `src/game/plant/heat-loop.ts` (setpoint, band, purge, ignition, modulation, flow switch, return limit) is the right shape for one boiler but has no sequencer either. Hence what the owner saw on the BH-MP2 mimic: every readout at 0, then a bunch of boilers lighting at once.

## 2. What real plant does

### 2.1 The hierarchy

A UK leisure centre's low temperature hot water (LTHW) plant of around 2000 is controlled in three layers. At the bottom, each boiler has its own burner control box (flame safeguard): it runs the ignition sequence, proves the flame, modulates the burner to hold its own flow temperature, and locks out on a fault; nothing above it can override its safety. Above that is a boiler sequence controller (a "cascade manager"), either a standalone box from the boiler maker (Hamworthy's Milton sequence controller of 2001 to 2012, later the Merley; Siemens RVA46/47 cascade controllers sold by Hamworthy 2005 to 2010; Potterton, Remeha and Viessmann equivalents) or a strategy in a BMS outstation (Trend IQ, Satchwell, Siemens Landis & Staefa, Honeywell Excel). At the top, the BMS supervisor and time schedule enable the plant and set the flow setpoint it should hold. Each heat load (pool calorifiers or plate heat exchangers, air handling unit heater batteries, DHW calorifiers, radiator circuits) has its own control valve and calls for heat; the sum of those calls is what the boilers see.

### 2.2 The common header sensor and the setpoint

The sequencer does not look at any one boiler. It reads a single immersion sensor in the common flow header (after all the boilers join, before the loads) and compares it with a flow setpoint. On a heating circuit that setpoint is usually weather compensated: an outside air sensor on a north wall and a compensation curve (for example 82 °C flow at −3 °C outside, sliding to 50 to 60 °C at 15 °C outside), often with a night set-back. A pool plant is a special case: pool water heating and DHW need hot water whatever the weather, so the primary loop is commonly run at a fixed setpoint (say 80 °C, or lower for condensing boilers with a big enough exchanger) or compensated only down to a floor high enough for the pool exchangers, with the weather-compensated radiator circuits on mixing valves downstream. Some controllers also take a demand signal from each load and raise the setpoint to the highest asked for.

### 2.3 Modulation and staging

Modern boilers modulate (a 300 kW condensing boiler perhaps 20 % to 100 %, a 5:1 turndown). The sequencer can run them in two broad ways. In series (classic lead/lag, "cascade" in Hamworthy's word), the lead boiler takes the load alone and modulates up; when it has been at or near full fire for a delay (typically 2 to 10 minutes) and the header is still below setpoint less a differential, the next boiler is started; boilers are shed in reverse when the last one has sat at low fire for a delay and the header is above setpoint plus a differential. In parallel ("unison" in Hamworthy's word), as many boilers as possible run together at low fire, which suits condensing boilers best since they are most efficient at part load: add a boiler when the running ones pass about 50 to 60 % and the newcomer can fire above its minimum, shed one when they all fall towards minimum. Either way there are minimum run and minimum off times per boiler, a staging interval between successive starts or stops (so a step change does not light everything at once), and an integral or PID term on the header error that produces a total "firing demand" (0 to 100 % of the plant) which is shared out.

### 2.4 Lead/lag rotation

To even out hours and starts, the lead boiler is rotated: round robin by hours run (the boiler with fewest hours becomes lead), by a fixed interval (weekly, or at a set time each day), or by number of starts. A locked-out or switched-off boiler is skipped and the next one promoted, and the plant raises a boiler fault alarm. Operators can usually fix the lead by hand, and a standby boiler may be held out of the rota (N+1 redundancy: a pool plant is sized so the full load can be met with one boiler out).

### 2.5 Anti-cycling and pumps

Anti-cycling comes from the differentials, the minimum on and off times, and the staging delays above. Each boiler has its own shunt or primary pump (or a motorised isolating valve on a common pump set) started by the sequencer before the burner is asked to fire, proven by a flow switch, and kept running after the burner stops (pump overrun, typically 2 to 5 minutes, to carry the heat out of the heat exchanger and avoid a local boil or a nuisance overheat trip). An isolated boiler's valve closes so it does not dilute the header with cold water. Low-loss headers are common in this period's refurbishments to decouple boiler and system flows.

### 2.6 The ignition sequence

Inside each boiler the burner control box runs a fixed safety sequence: the boiler's demand and pump flow are proven; the fan starts and its air pressure switch proves; pre-purge (on large forced draught burners 30 s or more, on modular condensing boilers often 5 to 30 s); the spark ignition (an ignition transformer and electrode, an audible tick tick at a few per second) comes on and the gas valves open at low fire for the safety time (typically 3 to 5 s, the trial for ignition); the flame is proved by ionisation (flame rectification, a few µA through the flame); the spark stops and the burner is released to modulate. If no flame is proved within the safety time the gas valves close, the box post-purges and retries (often 1 to 3 times) and then locks out, needing a manual reset. Flame lost while running closes the gas within about 1 s and, depending on the box, retries or locks out. A flame signal present during the pre-purge (a stuck valve or a faulty probe) is itself a lockout. When demand ends, the gas valves close, the fan post-purges for a few seconds, and the pump overruns.

### 2.7 Frost protection and other inputs

When the plant is disabled by the time schedule, frost protection overrides it: below an outside temperature (about 3 °C) the system pumps run, and below a water or space temperature (about 5 °C, sometimes 10 to 15 °C for the plant room) a boiler is fired. Other common inputs are a gas leak or emergency shut-off (the boiler house's ECV and solenoid safety valve, already modelled in `boiler-gas.ts`), a fire alarm interlock, a high-limit stat on the header, low system pressure, and the boiler house ventilation proving (no fire without combustion air: `boilersPermitted(house.combustion)`).

### 2.8 How the pools' demand reaches it

Each pool's heater is a thermostatic control loop of its own: a sensor in the pool return (before the heat exchanger) and a two-port or three-port valve on the LTHW side of the plate heat exchanger or calorifier, opening as the pool falls below its setpoint (27 to 29 °C for the main pool, hotter for spas). It does not talk to the boilers. As valves open, more cold return comes back to the boilers, the header temperature sags and the sequencer adds fire; as they close, the header rises and the sequencer sheds. In BMS installations, each heat load's "calling" signal also enables the system pumps and boilers (no loads calling, the boilers are disabled after an overrun), and the BMS may log which loads are calling.

## 3. A proposal for the game

### 3.1 Principles

Model first (`doc/plant-model.md`): a boiler sequencer block owns its state in the world, its six boilers' controllers stay their own blocks, and the room's panels only show and act on them. Keep the existing per-boiler controller and its codes; replace only the stand-in demand.

### 3.2 State in the world

A new `boilerSequencer` part of the boiler house's world state (a `WORLD_VERSION` bump, number reserved on the mailbox first): `enabled` (the time schedule and the operator's enable), `mode` ('series' or 'unison'), `setpoint` (°C) and `compensation` (on or off, with a curve of two points), `leadIndex`, `rotation` ('hours' or 'weekly' or 'manual'), per-boiler `hoursRun`, `starts`, `available` (switched on, not locked out, gas and air permitted) and `lastChange` (s), `stageTimer` (s since the last start or stop), `demand` (the shared firing demand 0 to 1, from a PI term on the header error) and `called` (which boilers it is asking to fire). The six boilers' controllers move into the world from the room's local `house` so that they keep running while the player is elsewhere, as the pumps' states do. The header flow temperature becomes a world value, calculated from the boilers' outputs and the loads' return water.

### 3.3 Each step

1. Read the header flow and return, outside air (from the weather already in the world, if any, or a fixed value), and the loads' calls (each pool heater's valve position, the AHU batteries, the DHW).
2. Work out the setpoint (fixed, or compensated with a floor for the pools).
3. Update the PI demand from the header error.
4. If the demand is above what the running boilers can give at their stage-up rate (series: lead at 95 % for 3 minutes; unison: all above 60 %), and `stageTimer` has passed, call the next available boiler in rota order; below their stage-down point for its delay, release the last one called, respecting minimum run and off times. If no load is calling, release all.
5. Rotate the lead at the chosen interval, or at once when the lead is unavailable; count hours and starts.
6. Pass each boiler its `demand` (called or not) and a modulation target, then step each boiler's own controller as now (it purges, ignites, fires, runs on, locks out as it does today).
7. Frost protection: below 3 °C outside with the plant disabled, run the pumps; below 5 °C header, call the lead boiler.

For the game's pace, the delays can be scaled (minutes in real plant, tens of seconds here) as long as the order and the staging are visible: one boiler lights, then another a while later, never several at once.

### 3.4 What the boards would show

The BH-MP2 mimic: the header's flow and return temperatures and the setpoint (LED digits), each boiler's lamps for CALLED, FIRING and LOCKOUT and its rate on a moving-coil meter, the LEAD lamp on whichever boiler leads, the plant's total demand as a bar or meter, and the loads calling. The control-room copy shows the same and works START/STOP of the plant enable (illuminated push buttons, per the mimic-copies rule), but the sequencer's settings (mode, rotation, lead selection, setpoint) stay on a sequencer panel in the boiler house: a Penfold Controls cubicle or a boiler maker's sequence controller with an LCD and keys, as a local-only control. Each boiler's own panel keeps its display and codes and adds a REMOTE DEMAND indication. Alarms (boiler lockout, sequencer header low, all boilers unavailable) go on both control rooms.

### 3.5 Code that would change

- `src/toolkit/gallery/rooms/plant/boiler.ts`: the `stepBoiler` call takes its demand and modulation target from the world's sequencer instead of `plant.boilersFiring` and the sine; the room's `house.boilers` move to the world.
- `src/toolkit/gallery/logic/control-room-demo.ts`: `boilersFiring` and the LTHW wave retired in favour of world readings.
- `src/game/plant/boiler-gas.ts`: `heatingPlant` reads the sequencer (enabled, header temperature) rather than standing for it.
- `src/game/plant/heat-loop.ts`: the single-boiler block gains an external demand input, or the six boilers become blocks in a new `boiler-sequencer.ts` in `src/game/plant/` with tests beside it.
- The boiler house schematic (`src/game/plant/back-room-schematics.ts`): the header sensor, outside air sensor and sequencer as nodes, so tags and the overlay follow the network.
- `src/game/world.ts` and `src/game/save.ts`: the new state, a migration and the `WORLD_VERSION` bump.
- The BH-MP2 mimic and the control-room copy: the indications above; the bridge's alarm list.

## 4. Boiler sounds

Each sound follows a boiler's controller code, so it is a matter of what the room plays for which state, with nothing new in the model.

| Phase                  | Controller code     | Sound                                                                                                        |
| ---------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------ |
| Called, pump starting  | 0 with demand, or 1 | pump hum begins (the pump's motor, held)                                                                     |
| Pre-purge              | 1 purging           | pump hum, plus the combustion fan spinning up (a rising whoosh, held)                                        |
| Ignition               | 2 igniting          | spark ticking, about 3 to 5 clicks a second, for the safety time; then a soft "whumpf" when the flame lights |
| Firing                 | 3 firing            | pump, fan and a low burner roar, its level following the firing rate                                         |
| Burner off, post-purge | 3 to 7              | flame and roar stop at once; fan runs down over a few seconds                                                |
| Pump overrun           | 7 pump run-on       | pump hum alone, for the run-on time                                                                          |
| Silent                 | 0 standby           | the pump runs down (a release) and the machine is silent                                                     |
| Failed ignition        | 2 to lockout        | ticking with no whumpf, then silence and the lockout buzzer or lamp                                          |

How it would be made in this codebase, without implementing it now: `src/toolkit/components/core/audio/part-audio.ts` is the one audio output. One-off sounds are `SoundRecipe`s (`click`, `tone`, `tones`, `sequence`, `recording`), played with `partAudio.play(recipe, object)`; the spark is a `click` with `repeat: [count, gap]` (a sharp high band, short decay), or a `sequence`, and the flame lighting a `click` with a low `thump` and a slow `sweep`. Held sounds are `LoopRecipe`s, held with `partAudio.hold(owner, recipe, from)` and released with `partAudio.hold(owner, null)`; a source with a `release` dies away by itself, which gives the pump and fan running down. The pump room already does this for its pumps (`src/toolkit/gallery/rooms/plant/pumps.ts`, about line 133, holding each pump's sound while it runs), and the spa pack plays one-off beeps (`spa-pack.ts`). Each boiler would hold three loops (pump, fan, burner, the last with its gain set from the rate) and play the ticking and the whumpf on entering code 2 and on its first second of code 3. Sounds must start only from state changes the room sees each step, so a boiler firing while the player is elsewhere is simply heard in its current state on return.

## 5. Sources

- Hamworthy Heating, Merley multiple boiler sequence controller (cascade or unison, up to 16 modules, time and temperature): https://hamworthy-heating.com/Products/Additional-products/Merley-boiler-sequence-controller
- Hamworthy Heating, discontinued products manuals (Milton boiler sequence control system 2001 to 2012; RVA 46 and RVA 47 cascade controller 2005 to 2010): https://hamworthy-heating.com/Technical-library/Manuals/Discontinued-products
- Hamworthy Heating, maximising boiler controls (sequence control and weather compensation): https://hamworthy-heating.com/blog/maximise-boiler-controls-to-use-less-energy
- Modern Building Services, Hamworthy introduces new boiler sequence controller: https://modbs.co.uk/news/fullstory.php/aid/9108/Hamworthy_introduces_new_boiler_sequence_controller_.html
- Viessmann cascade control unit installation, operating and service instructions (weather-compensated cascade): https://www.manualslib.com/manual/2356773/Viessmann-Cascade-Control-Unit.html
- Vaillant VRC 630 boiler management control: https://professional.vaillant.co.uk/for-installers/products/vrc-630-boiler-management-control-107909.html
- Bosch MC400 cascade sequencer (lead alternated to even out starts): https://www.bosch-thermotechnology.com/gb/en/ocs/mc400-cascade-sequencer-1072198-p/
- Laars cascade documentation (lead-first and parallel modulation modes): https://www.laars.com/document-library/file/7024
- AERCO BST boiler sequencing technology: https://aerco.com/dfsmedia/0533dbba17714b1ab581ab07a4cbb521/57986-source/bst-tds
- US patent 9822986, boiler control system (lead rotation by run time, staging delays): https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/9822986
- RasMech, lead-lag boiler controls guide (lag promoted when the lead fails): https://www.rasmech.com/blog/lead-lag-boiler-controls-the-ultimate-guide/
- Usable Buildings, heating controls (2013): https://www.usablebuildings.co.uk/UsableBuildings/Unprotected/HtgCtrl2013.pdf
- Resideo S8801 direct spark ignition module operation (flame proved by rectification current, trial timings): https://docs.resideo.com/s8801-dsi-control-module-im/en-us/operation.htm
- Trane, staged gas heat sequence of operation (pre-purge, retries, flame loss): https://support.trane.com/hc/en-us/articles/12118394877837-Precedent-with-Symbio-700-Staged-Gas-Heat-Sequence-of-Operation
- US patent 4451226, flame safeguard sequencer with safe start check (flame during purge a fault): https://patents.google.com/patent/US4451226

Figures not taken from a source above (staging delays, compensation curve points, overrun times, frost thresholds) are typical values from general UK HVAC practice and should be treated as starting points for tuning, not quotations.
