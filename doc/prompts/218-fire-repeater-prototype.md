# 218: Fire alarm repeater prototype in dev2

The owner, 2026-11-06. Paused before implementation at the owner's request. This mission develops the repeater in the fire demonstration room before it is installed elsewhere. It is a focused step toward [053](053-fire-alarm.md) and [issue #26](https://github.com/trebizondoculpepper/the_pool/issues/26), which tracks the control room's painted, unwired CR-CP6 keys.

## Aim

Model a working fire alarm repeater after the [Kentec Syncro View](https://kentec.co.uk/product/syncro-view/) and place it beside the main fire alarm controller on dev2's east wall. The two units must show and operate the same alarm system; the repeater is not a second independent fire alarm.

## Existing starting point

- Dev2's `createFireAlarmSystem` in `src/toolkit/components/fire/logic/fire-alarm-system.ts` already models the call point, smoke detector, sprinkler flow, alarm stages, panel access key, building sounders, SILENCE, EVACUATE and RESET. `fittings-room.ts` places its main panel on the east wall. Its panel's buzzer mute currently lives in a view-local signal, so another unit cannot observe it.
- The control room has a separate `createFireRepeater` in `src/toolkit/components/plant/views/control-room.ts`; its SILENCE, RESOUND, RESET and MUTE labels are painted on a canvas. It is not wired to the world fire alarm. This mission prototypes the correct model and controls in dev2; connecting CR-CP6 to the world remains part of issue #26 and mission 053.

## Reference behaviour

Use the [Syncro View datasheet](https://kentec.co.uk/wp-content/uploads/2018/06/DS43-Syncro-View-datasheet.pdf), [repeater manual](https://kentec.co.uk/wp-content/uploads/2018/07/man-1092_syncro_view_07.pdf) and [Syncro AS user manual](https://kentec.co.uk/wp-content/uploads/2018/08/man-1100.pdf) to check the fascia and access rules during implementation. The real repeater is a small, wall-mounted, approximately 330 × 255 mm unit with an LCD, status lamps, navigation keys and separate Re-Sound Alarm, Silence Alarm/Acknowledge, Silence Buzzer, Lamp Test and Reset controls. Level 2 access is needed to silence or re-sound the building alarms and reset the panel; silencing the local buzzer and testing lamps are available at level 1. A continuing alarm input must not be falsely cleared by RESET.

## Work

1. Extend the shared **dev2 fire graph** before making the visual: distinguish active alarm, building sounders silenced, panel/repeater buzzer silenced, access level and alarm reset. Add a separate re-sound action; decide explicitly whether the existing EVACUATE action remains an evacuation override. Both panels must read and act on these same nodes. Keep the model in pure logic with transition tests.
2. Build a reusable, real 3D repeater face with working individual keys and lamps, a live LCD, hover/use descriptions and audio cues. Lay the face out with the project's `face-grid` tool. The LCD and lamps must derive from the graph and redraw only when their visible inputs change. Display only conditions the model actually supports; do not paint permanent FAULT, DISABLED or TEST indications as if simulated.
3. Install it beside the existing main fire panel in dev2 and verify the position and reach using the project's look links and room audits. Both units must be independently usable while showing the same alarm, silence and reset conditions. Keep the existing main panel.
4. Document the model and visual decisions, including any difference from the Kentec reference. Treat a later world-state and CR-CP6 installation as a separate integration step requiring a reserved `WORLD_VERSION` and save migration if the world's shape changes.

## Acceptance

- Activating dev2's call point makes both units show fire and the sounders operate.
- Silence Buzzer quiets only the panel/repeater buzzer; the building sounders continue. Silence Alarm stops sounders but leaves the fire indication. Re-Sound restarts the sounders. Both units agree on these states.
- Level 2 controls refuse operation without access. RESET refuses a continuing call point, detector or sprinkler-flow input; after the source is cleared, reset succeeds and both units return to normal.
- The repeater's buttons can be clicked or used through the common input scheme, its indications reflect the real graph, and it is visible and reachable beside the main panel in dev2.
- Targeted logic tests and an in-browser dev2 interaction check pass. The scope and remaining CR-CP6 work are recorded in issue #26 and `TODO.md`.
