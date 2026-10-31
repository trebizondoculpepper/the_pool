# 097: Dev50, the delivery trucks: a chemical tanker and a containerised generator

Status: designed with the owner 2026-10-27; begun (`447f5e61`: the yard, the Haulmark rigs, a working ISO tank, Hazchem plates). The CO₂ cylinder lorry added 2026-10-31, below. A dev room to mock up the trucks before they go to the loading dock.

You are working on "The Pool", a browser game in TypeScript and Three.js simulating a leisure centre's pool plant (this repository). Read `CLAUDE.md` first; its rules apply: engineering items are real, working, branded and bound to a model; set decoration may be static; new equipment is modelled in a dev room before it goes into the leisure centre; all input through `src/toolkit/controls/`. Markdown is one paragraph per line.

## The request

The owner, 2026-10-27: a new dev room with no walls, "just a circle of tarmac that fades out after about 80 metres, kind of like our loading bay", holding two trucks carrying cargo: a chemical delivery truck with a cylindrical bulk container, and a truck with a containerised generator on the back. The rigs identical in both cases; only the cargo differs. Discussed before building.

Owner's answers (2026-10-27):

- **The rig:** identical tractor units, each pulling an identical skeletal container trailer (a bare chassis with twistlocks), each carrying a standard 20 ft container: an ISO tank container, or a containerised generator. About 16.5 m long overall.
- **How working:** the cargo is engineering and works; the unit and trailer are set decoration, with cab doors that open and lights.
- **The chemical:** a single-compartment ISO tank whose chemical is a parameter: its markings, coupling and colour band follow it, hypochlorite (14% sodium hypochlorite, UN 1791, class 8) or acid (hydrochloric acid, UN 1789, class 8). The dev room shows the hypochlorite one.
- **The units:** a 2000s European cab-over, after a DAF XF, Volvo FH or Scania R, under a maker of the game's own and a haulier's livery.
- **Brands** (the owner): the tanker in Chlorella Chemicals' own fleet livery (the site's chemical supplier, its operator's mark on the tank too); the generator Voltara's (the site's electricals company, "Switchgear you can lean on"; generators added to its `makes`), hired with its own unit in Voltara's livery; the tractor units made by **Haulmark**, a new brand (the owner's choice): plain British-industrial, after ERF and Foden, a shield badge, HAULMARK above the grille; added to `brands.ts` with its livery.
- **The layout:** side by side, about 4 m apart, their rear ends toward a line marked where the dock would be, chemicals on the left and power on the right, as at the dock's two bays; room to walk all round both.

## What there is to build on (checked 2026-10-27)

- The goods yard outside the loading dock (`src/toolkit/gallery/logic/dock-yard.ts`, `src/toolkit/gallery/views/dock-outside.ts`): tarmac as far as the eye can see under the standard overcast sky dome, its walkable limit a circle about 50 m across; `tarmacMaterial` is reusable. Dev50 takes the same idea with an 80 m fade and no building.
- The dock (prompt 073): two bays, lorries backing up from outside, rear ends only, chemicals left and power right; the loading bay's delivery fill cabinet (two inlets on incompatible couplings, `createFillCabinet`) and the generator connection cabinet (`back-room-schematics.ts`), which these trucks will one day connect to. The switch room's mains/generator changeover switch (089) has a generator position with nothing behind it yet: this generator is the start of that (TODO "A hired generator").
- Brands (`src/toolkit/components/core/logic/brands.ts`): Chlorella Chemicals and Voltara exist, with their liveries; Haulmark, the truck maker, is new.
- The next free dev room is dev50 (`dev-room-links.ts`).

## Design

**Dev50, the truck yard.** No walls, no roof: a disc of tarmac under the overcast sky, fading into the sky's colour from about 60 m to 80 m from the middle; walkable to about 70 m. A painted line for the dock's edge and two bay markings, with each rig reversed up to its bay. The room's title card on a free-standing sign by the spawn point. The walker starts beside the rear of the two trailers, looking at the cargo.

**The tractor unit** (set decoration, built once, used twice): a 4 × 2 cab-over unit about 6 m long, 2.5 m wide, 3.9 m high to its roof spoiler; a flat-fronted day cab with a grille, a sun visor, mirrors, a bumper with fog lamps, steps, a fuel tank and AdBlue tank on the chassis rails, an exhaust, a fifth wheel, air and electric lines (the "suzies") to the trailer, mudguards and wheels with tyres (twin at the rear). Haulmark's shield badge on the grille and its name above it; the operator's livery on the doors and visor (Chlorella Chemicals on the tanker's unit, Voltara on the generator's). Cab doors that open; side and tail lights and amber beacons that switch on. No engine, no driving.

**The skeletal trailer** (set decoration, built once, used twice): a 13.6 m-class skeletal container chassis, here carrying one 20 ft container at the rear (as a 20 ft is carried for delivery), its kingpin on the unit's fifth wheel, landing legs, three axles with wheels, side under-run guards, a rear bumper and light cluster, and four twistlocks under the container's corner castings.

**The ISO tank container** (engineering, working): a 20 ft frame (6.06 × 2.44 × 2.59 m) round a cylindrical tank of about 24,000 L, insulated and clad, a walkway on top with its manlid, a pressure relief valve and an air connection; at the rear, the bottom discharge: a foot valve worked by its handle, an outlet ball valve, a dry-break coupling with its cap (the coupling the fill cabinet's inlet for this chemical takes), a pressure gauge and a thermometer; a hose tube along the frame and a document holder. Placarded as ADR requires: the hazard diamond (class 8, corrosive) on all four sides, the orange plate with the hazard number and UN number (80 / 1791 or 80 / 1789) front and rear, the chemical's name and its colour band, and the operator's mark (Chlorella Chemicals). Its state a model of its own: contents (litres), the foot and outlet valves' positions, the coupling capped or connected, the tank's pressure; the gauge reads it; opening both valves with the coupling capped discharges nothing, with no hose connected spills (a model event, not yet a fluid). Pure logic in a `logic/` file with tests.

**The containerised generator** (engineering, working): a 20 ft container genset after a hire fleet's (about 300 kVA, 400 V, three phase), louvred intake and exhaust ends, an exhaust stack and rain cap on its roof, side doors to its control compartment and its cable compartment, a fuel tank inside (about 1,000 L, a gauge and a filler), an emergency stop on its outside, earthing point, and Voltara's livery and fleet number. Its control panel behind its door, period-appropriate (a 2000s genset controller after a DSE or ComAp unit): a key switch or STOP · MAN · AUTO, START, a small LCD and moving-coil meters for volts, amps, frequency and kW, fuel level, hours run, engine temperature and oil pressure lamps, a main breaker (the output, OFF / ON). It starts (cranks, runs up, its sound and exhaust), runs at 50 Hz, burns fuel by load, stops, and trips on an emergency stop, low fuel or overload. Its output terminals in the cable compartment, where the cable to the building's connection cabinet will land; in the dev room its load is a dial on a load bank or nothing connected. Pure logic in a `logic/` file with tests.

## The third rig: Arncliffe Gases' CO₂ cylinder lorry (added 2026-10-31)

The owner, 2026-10-31: the CO₂ supply (mission 118, `doc/prompts/118-co2-into-the-plant-rooms.md`) keeps a left and a right rack of cylinders in the cage outside the loading bay, counted in grams. A delivery replaces whichever rack is spent and not in service. "I imagine it's another articulated lorry, but this one is carrying on its back a cage of cylinders of bottled gases." The owner asked for it to follow the British standard.

**What the real ones are** (checked 2026-10-31):

- **The fleet.** The UK's industrial gas companies carry cylinders on articulated flatbed trailers loaded with cylinder pallets. BOC's Tiger Trailers flatbeds, for example, carry up to 26 "pintle pallets", in rows either side of a central aisle closed by a portable safety gate. The cylinders stand upright, strapped or caged, and a pallet that isn't strapped properly is the known spill risk.
- **The rules.** Carriage in the UK is under ADR (the Carriage of Dangerous Goods Regulations). BCGA Code of Practice 50, _The carriage of gas cylinders on vehicles_ (2023), replaces GN 27 and was written with the Department for Transport.
- **The goods.** Carbon dioxide is UN 1013, class 2.2 (non-flammable, non-toxic gas), and carries the green 2.2 diamond. A full lorry load is far over ADR's small-load threshold, so the vehicle carries plain orange plates front and rear, and the driver carries the transport documents and the instructions in writing.
- **The cylinders.** They are coloured to BS EN 1089-3, with CO₂'s grey shoulder, as `gas-cylinder.ts` already does.

**The rig:**

- **The unit** is the same Haulmark tractor unit as the other two, in Arncliffe Gases' livery (blue, grey and near-black, the cylinder mark; `brands.ts`).
- **The trailer** is a 13.6 m flatbed, not the skeletal container chassis: a deck with steel side rails and stanchions, and an aisle down the middle with a safety gate at its rear, carrying rows of cylinder pallets.
- **Each pallet** is a galvanised mesh cage with fork pockets, holding one rack's worth of cylinders, four upright 34 kg CO₂ cylinders (`CO2_CYLINDER`). It matches what the cage at the loading bay holds, so a delivery is a pallet off and a pallet on. The other pallets carry other gases from Arncliffe's range (nitrogen, argon, oxygen), coloured to BS EN 1089-3, as set decoration since only CO₂ is delivered here.
- **Unloading.** A truck-mounted forklift rides on the trailer's rear on its own mounting, after the Moffett and Palfinger kind gas and builders' merchants use. The yard is tarmac at ground level, with no dock leveller where the cage stands.
- **Markings:** the orange plates front and rear; the 2.2 diamonds on the pallets, as the cylinders carry them; Arncliffe's name and "COMPRESSED GASES" on the headboard; and a document holder in the cab.

**Working parts.** The pallets are engineering: each knows its gas and its grams and is bound to the delivery's model. The forklift is drawn and set decoration for now, with its forks raised and lowered by the delivery's animation, not by the player. The unit and trailer are set decoration, with cab doors that open and lights, like the other two.

**The delivery, later** (mission 118's "Later"): the lorry pulls up in the goods yard beside the cage. The forklift comes off the back, lifts the spent rack's pallet out of the cage and onto the trailer, and sets a full one in its place. It is the same world action as `co2 swap`, animated. Dev50 shows the rig parked, with one pallet's space empty at the rear, the forklift mounted, and the safety gate shut.

**Decided on normal practice** (the owner may overrule):

- a flatbed trailer and a truck-mounted forklift, rather than a curtainsider or a crane;
- one rack per pallet;
- the other gases' pallets as decoration.

## Steps

1. Dev50's yard: the tarmac disc and fade, the sky, the dock line and bays, the title card, collisions round the rigs.
2. The tractor unit and the skeletal trailer, built as components and placed twice.
3. The ISO tank container, its model and its working valves, coupling and gauge; built for either chemical, shown with hypochlorite.
4. The containerised generator, its model and its working panel and sound.
5. Screenshots from the walker's height round both rigs, and from above; the owner looks at them before the trucks go anywhere near the dock.

## Later, not in this mission

The trucks at the dock's bays, backing up; the tank's coupling to the fill cabinet and a delivery that fills a store; the generator's cable to the connection cabinet and the changeover switch's position II powered by it (TODO "A hired generator"); an acid tanker as a second instance; the CO₂ lorry's delivery animated in the goods yard (mission 118).
