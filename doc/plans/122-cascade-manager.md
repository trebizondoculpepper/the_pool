# 122: The Hamwarmy CM6 boiler cascade manager

Mission 122 ([brief](../prompts/122-cascade-manager-design.md)), `nicole_buruaah` in charge. The owner wants the boiler cascade controller as "a quite modern type machine … if it was 2010s", from the boilers' own maker, replacing mission 121's rough panel. Stages 1 and 2 (research, design, the unit built and tried on dev0 and in dev39 against its own view type) were started alongside 121 at the owner's request; stage 3 (the adapter from 121's `BoilerSequencerState`, installation by the common flow header, and the menus wired to 121's world actions) followed once 121 had merged, the same day; the unit now lives in dev65, the boiler room, and in the boiler house.

## 1. Research: real 2010s cascade managers

What the real units have in common, and where the sources were thin.

- **Hamworthy Merley** (UK, the boilers' maker's own, launched about 2014): a sequence controller for up to 15 or 16 modules in cascade (lead first) or unison (all together at low fire), with lead rotation and load sharing, heating-zone and DHW management, relaying each boiler's fault codes to its display. Hamworthy's product book gives three forms with dimension drawings: a display unit about 144 × 96 mm (a DIN panel cut-out about 138 × 92 mm), a wall-mounted box about 400 × 300 × 150 mm, and a loose kit about 281 × 121 × 70 mm (the figures came through jumbled in the page text, so their mapping is tentative).
- **Siemens Albatros RVS43 / RVS63 with the AVS37 operator unit** (Hamworthy sold Siemens cascade controllers from 2005 to 2010): the operator unit is a 144 × 96 mm front with a monochrome backlit graphic LCD, one large knob turned to move through lines and change values and pressed to confirm (OK), an ESC key, an INFO key, operating-mode keys and a manual / chimney-sweep key. Its home ("basic") display shows the time, mode symbols, a flame symbol while the burner fires and a large temperature; its cascade settings include the lead strategy, release and reset integrals, a restart lock, a switch-on delay, automatic source-sequence changeover after a number of hours, and a fixed leading source. (The Albatros2 user manual, CE1U2354en, could not be read in full here; the knob, keys and display are as Siemens' and its OEMs' operating instructions describe them, from recall, and should be checked against the manual before quoting.)
- **Viessmann Vitotronic 300-K (MW1B / MW2B)**: a weather-compensated cascade control for up to four boilers and three heating circuits; its operating module sits behind a cover pulled open from the top, with a display and push buttons over a system diagram, three operating levels (user, operating details and set values, configuration), hours-run and start counters for each boiler, a fault menu of current faults and the last ten, and a weekly automatic change of the boiler sequence by hours run.
- **Remeha** (Quinta Pro, Quinta Ace): the boiler's own panel has "a control panel with rotary knob and graphic display" and an integrated cascade control for up to eight boilers; the iSense Pro and MC4 are its multi-boiler controls.
- **Bosch / Buderus Logamatic** (4000 and 5000 series, MC400): modular boiler-house control; the MC400 cascade sequencer alternates the lead to even out starts. Its dimensions and display were not found in what could be read.

Conventions taken: a wall unit from the boiler maker, light grey ABS with rounded edges, a monochrome backlit graphic display, one turn-and-push knob with a few dedicated keys (home, back or ESC, info), a manual or service key kept from casual hands, per-boiler status, hours and starts counters, a fault list, and terminals and comms behind a cover.

## 2. The chosen unit

- **Maker and model:** Hamwarmy Heating (`brands.ts`), the CM6 Cascade Manager, for up to six boilers. Its badge and model name across the top of its fascia; no Penfold mark (it is the boiler maker's product, not a Penfold panel).
- **Case:** 300 × 240 × 85 mm (about A4, between the Merley's display unit and its wall box), light grey (`#d9dcd8`) ABS, 14 mm corner radius. A dark polycarbonate fascia over the upper 165 mm.
- **Display:** a 240 × 128 dot FSTN graphic module, active area 95 × 51 mm (about 4.2 in), white LED backlight: dark blue-black dots on a pale field. Drawn one texel a dot, nearest-filtered.
- **Knob:** 38 mm, on a 24-detent rotary encoder with a push switch (`jog-dial.ts`). Turning follows the game's one rotary rule (a use on its left half turns it down, its right half up; a pad's LB and RB); a use on its centre cap pushes it (a pad's A).
- **Keys:** HOME, BACK and INFO, 16 mm membrane keys under the knob; a red SERVICE key behind the flap.
- **LEDs:** a tri-colour LED for each boiler (green firing; amber called, purging or igniting; red flashing locked out; off otherwise) and a STATUS LED (green running in AUTO, green flashing stopped in AUTO, amber in HAND, red flashing on a fault, off when disabled).
- **Terminal flap:** the lower 45 mm, hinged at its foot, dropping forward to open (a use toggles it): green rising-clamp terminals (mains, boiler bus 1 to 6, header and return sensors, outside air sensor, enable, alarm), its Modbus RTU and BACnet MS/TP ports, a USB service socket and the SERVICE key.
- **PLANT ENABLE:** a 90 × 130 × 65 mm grey box 30 mm to the right, with a three-position key switch OFF · AUTO · HAND (the game's lever-selector key switch). A local safety control: the control room can START and STOP the plant only in AUTO.

## 3. The screen, page by page

Every page is 240 × 128 dots in the controller's 5 × 7 font, with an inverted title bar. Pure logic in `src/toolkit/components/plant/logic/cascade-manager.ts`; the screen is described first (`cascadeScreen`) and drawn in dots (`drawCascadeScreen`) only when that description changes.

- **Home:** the title bar (HAMWARMY CM6, the mode AUTO RUN, AUTO STOP, HAND or OFF, and the time). Left: FLOW HEADER and its temperature large (to 0.1 °C), SET and the set point under it, and a trend of the header over the last half hour or so with the set point dotted across. Right: the plant as a schematic, the flow header across the top and the return below, six boilers between them, each with a flame flickering in four frames while it fires (its size by its firing rate), three dashes while purging or igniting, a dot when called, a small pump on its return while its pump runs on, a cross when locked out, dotted when off; its number below, inverted for the lead; LEAD Bn SERIES and n/6 FIRING. Across the foot the firing demand as a bar with its percentage, and a status line: the alarm or lockout inverted, else PLANT DISABLED, HAND, STOPPED, or PUSH KNOB FOR MENU.
- **Main menu:** FLOW SET POINT, STAGING, MODE AND ROTATION, BOILER HOURS, FAULTS, UNIT INFORMATION. Turn to choose, push to open, BACK home.
- **Flow set point:** the set point (50 to 85 °C in 1 °C steps) and the header now.
- **Staging:** stage up delay and stage down delay (30 s to 15 min in 30 s steps), minimum run time (1 to 20 min in 30 s steps).
- **Mode and rotation:** MODE SERIES (shown, not changed: the boiler house runs series fill only), LEAD ROTATION (BY HOURS or FIXED), and the lead: LEAD NOW, read-only, by hours; FIXED LEAD, editable, when fixed.
- **Boiler hours:** each boiler's hours run and burner starts; push opens the boiler.
- **Boiler Bn:** its state, firing rate, flow temperature, hours, starts, its controller's code and whether it leads; turn for the next boiler, BACK to the list.
- **Faults:** the sequencer's alarms (BOILER LOCKOUT, HEADER LOW, NO BOILER AVAILABLE), each NEW until accepted and ACK after, each locked-out boiler with its code, PLANT ENABLE OFF, or NO FAULTS; then two command rows, ACCEPT ALARMS and RESET LOCKOUTS (every locked-out boiler reset), which took over mission 121's rough panel's ACCEPT and RESET.
- **Unit information:** model, software 2.14, boilers, bus.
- **Service** (the SERVICE key behind the flap): Modbus address and line settings, BACnet MAC, the USB socket, the boiler bus.
- **Editing:** push on an editable row puts its value in an inverted box between < and >; turning changes it within its limits (the knob's cue goes red at a limit); push saves and sends the edit; BACK drops it. INFO shows a boxed help for the page until the next input. Left four minutes untouched, the unit returns home, dropping any edit.

## 4. Its interface to the plant

The unit holds none of the plant. It is given a `CascadeManagerView` each frame and gives back `CascadeEdit`s and the key switch's `PlantEnable`. Stage 3 (2026-11-02, after mission 121's `33977596`) binds it to the world in `src/toolkit/gallery/logic/cascade-manager-view.ts`, pure and tested:

- **What it shows** (`cascadeViewOf`): `world.boilerHouse.sequencer` (PLANT ENABLE, RUN, the set point, the staging delays and minimum run, the rotation, the lead, the demand, each boiler's hours run and starts, and its three alarms, flashing until accepted), each boiler's controller from `world.boilerHouse.boilers` (its code: 1 purge, 2 ignition, 3 firing, 7 pump run-on, 9 blocked; its lockout, shown as E0n with its fault's code; its rate and flow; a boiler at standby that the sequencer has called shows as called), the header from `world.lthw.flow`, and the time of day from `world.time`.
- **Its trend:** the world keeps no history of the header, so the unit keeps its own log, as a real controller does (`logHeader`): a reading every 20 s of world time, 108 of them; begun full of the first reading when the unit is first shown, and begun again if the world's time goes back.
- **What it asks** (`cascadeAction`), as the world's `'boiler-house'` actions: the set point, staging delays and minimum run as `{ act: 'setting' }` (121's `SEQUENCER_SETTINGS` has exactly the unit's ranges and steps), the rotation as `{ act: 'rotation' }`, a fixed lead as `{ act: 'lead' }`, the key switch as `{ act: 'enable' }`, and the faults page's two command rows, ACCEPT ALARMS and RESET LOCKOUTS, as `{ act: 'accept' }` and `{ act: 'reset' }`.
- **What it replaced:** mission 121's rough panel on BH-MP2 (PLANT ENABLE as three buttons, ACCEPT and RESET); BH-MP2 keeps its indications and works nothing. The control room's copy, CR-MP7, keeps START and STOP of the plant, which work in AUTO only.

## 5. Redraws and cost

The display draws only when its description changes (the header to 0.1 °C, the trend's dot rows, the demand's percentage, the menus), compared before any drawing, and the description is only rebuilt when the view object, the menus or the flame frame change. Its flames flicker at five frames a second, only while a boiler fires; the display is an `lcd` of at most six pictures a second. Benchmark (`bench.html?bench=components&only=cascade manager`, 2026-11-02, Apple M5): within budget, 5 uploads a second idle and 5.8 running, 154k texels a second idle and 179k running (budgets 250k and 300k), 1.0 ms render, 113 draws.

## 6. Trials and installation

- Dev0: the knob alone on the TURN-AND-PUSH KNOB board on the south wall, twice life size: push to edit, turn a value 0 to 20, push to save.
- Dev39 (stages 1 and 2): the whole unit, run by a stand-in sequencer, with a trial station. Removed in stage 3, with the stand-in.
- Dev65, the boiler room (the owner, 2026-11-02): the unit among the boiler house's exhibits, on the world's sequencer.
- The boiler house: BH-CP3, `asset-1308`, on the south wall 1.75 m from its west corner, by the low-loss header, its key-switch box to its right; registered in `installed-asset-ids.ts`, a node of the boiler house's schematic on the room's electrics, and classified (`equipment-kinds.ts`, `health.ts`, `world-bindings.ts`).
- The owner's ruling on colour (2026-11-02): no black or near-black buttons, which render badly; the knob is light grey with an orange pointer, HOME and BACK light grey, INFO blue, and the key switch's ring nut light grey.

## Sources

- Hamworthy Heating, Merley multiple boiler sequence controller: https://hamworthy-heating.com/Products/Additional-products/Merley-boiler-sequence-controller
- Hamworthy Heating, the big book of products and services, the Merley's dimensions: https://documents.hamworthy-heating.com/big-book-of-hamworthy-products-and-services/78/
- Modern Building Services, Hamworthy introduces new boiler sequence controller: https://modbs.co.uk/news/fullstory.php/aid/9108/Hamworthy_introduces_new_boiler_sequence_controller_.html
- Siemens, Albatros2 RVS43 / RVS63 boiler controllers user manual (CE1U2354en, 2007), with the AVS37 operator unit: https://manualzilla.com/doc/5751298/albatros-boiler-controllers-user-manual-oem-rvs43..-rvs63
- Viessmann cascade control unit, installation, operating and service instructions: https://www.manualslib.com/manual/2356773/Viessmann-Cascade-Control-Unit.html
- Viessmann Vitodata device list (Vitotronic 300-K MW1B scope): https://vitodata100.viessmann.com/VD100/ApplicationHelp/VD100/1033_en_US/Ger%C3%A4teliste.html
- Remeha Quinta technical sheet (rotary knob and graphic display; cascade to eight boilers): https://pim-media.eco-star.be/c/f/8/e/cf8e3aea197dc8784ba9db9dfb899f2e680b4e3d_Technische_fiche___Remeha_Quinta.pdf
- Bosch MC400 cascade sequencer: https://www.bosch-thermotechnology.com/gb/en/ocs/mc400-cascade-sequencer-1072198-p/
- Buderus Logamatic 5000 planning document: https://www.buderus.com/lt/media/country-pool/professional/technical-documentation/planungsunterlage_5000_en_2019.pdf
- Mission 122's research background: `doc/research/boiler-house-control.md` §2.

Figures not from a source above (the CM6's exact size, its display module's area, the setting ranges and steps) are design choices within the real units' range, not quotations.
