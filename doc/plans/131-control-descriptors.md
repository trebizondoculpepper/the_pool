# 131: Control descriptors, plan and first delivery

The brief: [doc/prompts/131-control-descriptors.md](../prompts/131-control-descriptors.md). Implemented 2026-11-02.

## Shape

`src/game/descriptors/descriptor.ts`: `ObjectDescriptor` (ref, room, kind, class, name, controls, readings, view, presets), `Control` (key, ref `<object>/<key>`, label, form, inputs, `action(world, input)`, `view`, `position`, `targets`), `Reading`, `ViewState`, `Preset`; `applyPreset`, `readAll`, `initialView`. `registry.ts`: `objectDescriptors(room?)`, `descriptorFor`, `controlFor`, `soleControl`, `kindControls`. `binding.ts`: `workControl` and `twoWayBinding`, what the views call.

## Coverage

- **plant_pool_03:** PL3-CAB1 (POWER, RESET, JETS, AIR, + and −, DISPLAY, WASH MODE, WASH NOW; five lamps and the display; doors and page view state; presets in service, off, doors open, tripped), PL3-CAB1-IS1, the valve panel (OPEN and SHUT for each motorised valve), the 18 valves (a lever's handle, a motorised valve's override; the drain valve's action is `pool/drain-down`, as its view's was), PL3-BT1 (gauge), PL3-DT1 and PL3-DT2 (level).
- **control_room:** CR-MP1 (pumps' START and STOP through `mainPoolMimicCommand`, lifted from `pressPump`), CR-MP2, CR-MP6 (the read-only copy: buttons inert), CR-MP7 (START and STOP to the boiler house), CR-MP8 and CR-MP9; page buttons and per-mode presets for each; lamps and readouts where the state function is pure (not CR-MP7, CR-MP8).
- **Not yet:** dev0's boards (view-built, no command functions), every other room (stage 2 onwards, `TODO.md`).

## Views reading from it

`jacuzziWorldBinding` and the jacuzzi's `spaFilterWorldBinding` (`spa-pack.ts`); PL3's valves, valve panel and isolator (`cabinet-services.ts`); described rooms' chemical valves (`chemical-line-fittings.ts`); the main pool board's presses (`rooms/plant/control.ts`) and CR-MP7's (`control-room-upper-mimics.ts`). 126's catalogue panel lists a kind's controls (`kindControls`).

## Tests

`src/game/descriptors/descriptors.test.ts` (the room's objects, actions and positions, presets, mimic commands, unique ids, every input's action accepted by the world) and `src/toolkit/gallery/views/descriptor-coverage.test.ts` (builds the cabinet services, room pipework, cabinet binding and the working mimics against a stand-in store, works every use, and checks each dispatched action is a descriptor's).
