# 118: CO₂ into Plant 1 and Plant 2, under the Trios

The owner, 2026-10-31: "start plumbing in the carbon dioxide lines from the outside world, which will lead into the plants 1 and 2 only. And then there would need to be some kind of valve that links into the injection point and some kind of control system that allows the Aqualis trio to control that valve on or off … we want to see if that improves the situation now that the system has a milder acid to work with." It follows the advisor verification (`doc/plans/aqualis-advice-verification.md`, merged 2026-11-01), whose worked chemistry it builds on.

## Coordination (2026-11-01)

The owner clarified on 2026-11-01 that this pickup is the functional path: Plants 1 and 2 need low-pressure CO₂ in the simulation, a Trio-controlled valve, and a pipe to each correct injection port. The loss-rate comparison and possible abuse or fault scenarios can follow later. The original wider brief below records those later possibilities; they are not gates for this pickup.

The owner is giving this mission to another agent while the Claude session `nicole_buruaah` (agent-inbox) fixes the model's CO₂ loss rate in `src/game/water/` and `water-treatment.ts`.

- **Can start now:** steps 1 to 4 and 6, meaning the model, the Trio's CO₂ port, the world state and stepping, the drawing, and the console stand-ins.
- **Must wait for the CO₂ loss fix to merge:** step 5, the experiment. Run before the fix, it would measure the bug, not CO₂ dosing. `nicole_buruaah` will mail when it has merged.
- **Don't edit:** `src/game/water/`, `water-treatment.ts`'s CO₂-loss and `SETTLED`/`MAINTAINED_ALKALINITY` code, `aqualis-advisor.ts`, `hand-dose.ts` and `test-kit.ts`, until that mail arrives. This mission's chemistry seam is `Additions.co2`, which already exists; feed grams into it and leave the chemistry alone.
- **Agree a `WORLD_VERSION` number before taking one:** it is 65 now, and the CO₂ loss fix may need one. Mail `nicole_buruaah`, and rebase onto `main` before merging.
- **`aqualis-world.ts`:** changes to the Trio's CO₂ port and `ChannelPorts.co2` belong to this mission. Say in the mail which functions you touch.

Read the root `CLAUDE.md` first: the model is the source of truth, so each change goes into the graph first, then the plumbing, and then the scene binds. Also read `doc/plant-model.md`, `doc/room-layout-guide.md`, `doc/prompts/109-co2-supply.md`, `doc/plans/co2-system.md` (the pure logic, already built and tested), `doc/plans/114/placement.md` ("The CO₂ channel until CO₂ exists") and `doc/plans/new-game-normal.md` (the Lounge's pH drift and the spas, both put down to CO₂ loss and acid control).

## What exists

- **The supply logic** (`toolkit/components/plant/logic/co2-supply.ts`): the cylinder banks, the changeover and the regulator.
- **The supply's drawing**: `co2-cage.ts`, a mesh cage with two banks of four cylinders.
- **The rest of the pure logic**:
  - `co2-distribution.ts`: the master valve, the building line and the wall ports;
  - `co2-dosing.ts`: the Lounge's solenoid-and-rotameter panel, the Olympic's mass-flow panel, and their `ChannelFeedback` for the Trio;
  - `co2-detection.ts`: the NDIR detectors, A1 and A2, and their interlocks;
  - `co2-plant.ts`: the world's seam, `Co2Plant` and `stepCo2Plant`.
- **The test rig**: `co2-loop.test.ts` closes the loop around the Trio's controller on the rig.
- **The Trios**: each has a `co2` control port that is declared and not linked, a blanking plug in its CO₂ gland, and `ChannelPorts.co2 = null`.

## The mission

1. **The model first.** Add the CO₂ system to the schematics as nodes, fittings and links, each with its function, normal state and tag, all derived:
   - the cage and manifold;
   - the emergency isolation valve;
   - the master valve and its panel;
   - the loading bay's detector;
   - each plant room's wall port and its isolating valve;
   - each room's CO₂ valve controller;
   - its injection point into the circulation (a nozzle or diffuser with its check valve, and the booster it needs, as `co2-dosing.ts` assumes);
   - each room's detector.

   The building line between the loading bay and the plant rooms is not modelled pipe by pipe, as `co2-system.md` already decided. Model it as one link through the wall.

2. **The Trio's CO₂ port.** Link the port to its room's valve controller: the 4–20 mA and the release contact out, and `ChannelFeedback` back. The CO₂ gland's blanking plug becomes a gland with its cable. The Trio's sharing (CO₂ first at `CO2_PER_HCL`, acid trimming the rest) then works as designed.
3. **The world.** Add `Co2Plant` to the world state. Bump `WORLD_VERSION` and add a migration that gives existing saves the system in its normal state. Step it each world step with each room's Trio demand and its water flow, and feed its grams into each pool's `Additions.co2`. Local controls stay local, under the CLAUDE.md rule: the master valve's panel and RESET in the loading bay, each panel's REMOTE · MANUAL · OFF selector in its plant room. Alarms go to the plant rooms' annunciators and the loading bay's detector panel.
4. **Drawn and placed.** Stand the cage where the decision below says. Plumb the line in light-grey-banded copper labelled "CO₂", from the regulator to the wall inlet in the loading bay's external wall, with the emergency isolation valve beside it, and then the master valve. In each plant room draw the wall port, the dosing panel (Chlorella Chemicals), the injection point in its line, and the detector head at 0.3 m off the floor, all following `co2-system.md`'s "How it will be drawn". Each item is a real, working component, bound to its node.
5. **The experiment the owner asked for.** Using `new-game-normal.slow.test.ts` and the advisor verification suite, measure with CO₂ against acid alone on both pools:
   - pH held against its set point;
   - acid used;
   - TDS and chloride rise;
   - alkalinity drift;
   - how long the Lounge stays in band;
   - the advice-following results.

   Report it as a table in `doc/plans/co2-system.md`, and say plainly whether the milder acid helps. If it shows that the CO₂-loss formula is still the real cause, say so.

6. **Console stand-ins**, where gameplay isn't designed yet: cylinder swaps, and a `co2` command showing the line, panels and detectors.

## Decisions

The owner, 2026-10-31, asked in turn:

1. **The cage stays outdoors** in the goods yard against the loading bay's wall, as mission 109 placed it (BCGA CP 44 prefers cylinders outdoors). The line enters through the loading bay's wall to the emergency isolation valve and master valve just inside.
2. **Plants 1 and 2 both take CO₂**, the Lounge as well as the Olympic.
3. **The panels stay as built:** the period solenoid-and-rotameter panel in the Lounge, which the Trio pulses on and off over its 60 s cycle with a needle valve setting the flow, and the modern mass-flow controller in the Olympic, which the Trio sets from 0 to 2 kg/h. Two kinds of interface side by side.
4. **CO₂ first, acid trims:** each Trio shares its pH demand CO₂ first, up to its valve's most, with acid taking the rest (as built). The experiment compares this with acid alone.
5. **Two racks, counted in grams** (the owner, 2026-10-31): the world keeps no cylinder-by-cylinder state. It keeps a left rack and a right rack, each with its grams of CO₂ left, and which rack is in service. The service rack is drawn from until it is spent. The manifold then changes over automatically, as built, and draws from the other. The spent rack's flag goes red, and BANK EMPTY and CHANGE CYLINDERS are called; with both spent, SUPPLY EXHAUSTED and, soon after, LINE PRESSURE LOW. The pressure is derived from the rack in service: CO₂'s vapour pressure while its liquid lasts, then falling with the gas left, as `co2-supply.ts` works it today. Simplify `Co2Supply` to the two racks' grams; the cage still draws four cylinders a rack. The fix is a swap, which refills whichever rack is spent and not in service. It is one world action, made from either of two places: a use on the spent rack at the cage, standing in for a delivery, or the console stand-in `co2 swap`, which needs no argument because it picks that rack itself. Both are logged; a swap with nothing spent is refused, and says why.

On normal practice (the owner may overrule):

6. **The Olympic's 2 kg/h is a base load,** with acid trimming the peaks; a bank of four couldn't supply 5 kg/h without a heater.
7. **RESET clears the 8-hour average's A1** once the instantaneous reading is clear. An 8-hour time-weighted average is a personal-exposure measure and should not hold a plant room shut after the leak has cleared. The 15-minute A2 still latches until it is reset.
8. **A low alarm (A1)** shuts that room's dosing only. A high alarm (A2) trips the master valve for the whole building, as built.
9. **Alarms** go to the plant rooms' annunciators and the old control room's, with the loading bay's detector panel local (mission 109).

10. **The mimics warn** (the owner, 2026-10-31): the Lounge's and the Olympic's water-treatment mimics, in their plant rooms and the old control room, gain a CO₂ section. It has a CO₂ PRESSURE LOW warning lamp, lit from the line's LINE PRESSURE LOW and a wall port's NO SUPPLY PRESSURE, and a CHANGE CYLINDERS lamp lit from the manifold's flags. Both follow the mimics' existing lamp conventions; try them on dev39 first, as CLAUDE.md asks. The control-room mimic shows them but cannot reset anything: the swap is done at the cage, which is a local control.

## Later, not this mission

What a CO₂ leak does to the player in the room (breathlessness, a fading view), cylinder deliveries as gameplay: a delivery lorry pulls up in the goods yard and its crew replace the spent, inactive rack, animated; the same swap action underneath, and the regulator's heater for higher draws.
