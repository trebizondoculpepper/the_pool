# 122: The boiler cascade manager, designed

The owner, 2026-11-01: the boiler cascade controller is "a special mission to itself", after mission 121 has made the boiler house work with a rough panel; "a quite modern type machine … if it was 2010s". This mission designs the real thing and replaces 121's rough panel with it. It changes no model: it shows and works mission 121's sequencer. The owner has put `nicole_buruaah` in charge of missions 120 to 122. Starts once mission 121 has merged.

Read `CLAUDE.md` (real products, controls through `src/toolkit/controls`, redraw only on change, the benchmark, local controls stay local, try new controls on dev0 and assemblies in dev39 first) and `doc/research/boiler-house-control.md` §2.

## The design discussed with the owner

- **Maker:** the boilers' own maker, Hamwarmy Heating (`brands.ts`), as real plants used the boiler maker's sequence controller (Hamworthy's Merley, Viessmann's Vitotronic 300-K, Siemens' Albatros cascade controllers, Bosch's Logamatic). Look these up and follow their proportions and conventions.
- **Where:** on the boiler house wall by the common flow header, where its header sensor is and where an engineer would stand to see the boilers.
- **The unit:** a 2010s wall-mounted box about A4 in size, light grey or white with rounded edges, its terminals, Modbus or BACnet and a USB service port behind a hinged lower flap.
- **Its display:** a graphic display (a backlit monochrome dot-matrix about 3 to 4 inches, or a small colour TFT) showing the six boilers as a small schematic with animated flames on those firing, the header temperature large with a short trend line, the firing demand as a bar, the lead boiler, and menu pages for the set point, staging delays, minimum run time, the mode, the lead rotation and each boiler's hours and starts.
- **Its control:** one turn-and-push knob (a jog dial): turn to move through menus and change values (the existing rotary rule), push to select; HOME, BACK and INFO keys; a MANUAL or SERVICE key behind the flap. Not a touch screen: the Dr Aqualis Trio already is one, and the game wants variety.
- **Per-boiler LEDs:** a coloured LED each (green firing, amber called or purging, red lockout, off idle), and a status LED for the unit.
- **A physical holdover:** a key-operated PLANT ENABLE switch (OFF · AUTO · HAND) beside it, a local safety control.
- **The control room:** the boiler house mimic and its control-room copy show what it does; the control room may START and STOP the plant in AUTO only.

The display animates at no more than 10 Hz and redraws only when what it shows changes; run the component benchmark. Try the knob on dev0 and the whole unit in dev39 before installing it.
