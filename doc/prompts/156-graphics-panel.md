# 156: The graphics panel: HAND · AUTO, motorised controls, cover and trace recorder

The owner, 2026-11-04. Brief only; not started until the owner says. Split from the constant-frame-rate work (154–157). Read `CLAUDE.md` (the face-grid rule), mission 096's settings panel (`src/toolkit/menus/logic/settings-panel.ts`, `views/settings-panel-view.ts`) and the research `doc/research/constant-frame-rate.md`.

## What it is (the owner's decisions, 2026-11-04)

- **One graphics panel** in the Esc menu holding every manual graphics control (the preset lever, Render quality, the resolution cap, AO mode and the rest), moved off the settings panel, laid out on `face-grid` (`src/toolkit/components/core/logic/face-grid.ts`), designed with its debug overlay on and shipped with it off, carrying the Penfold mark.
- **A HAND · AUTO knob.** In HAND the controls work as today; in AUTO the frame-rate governor (157) drives them. **Default AUTO** for a new player.
- **A lock-out lamp,** a simulated neon indicator, lit while AUTO has the panel.
- **A target selector:** 30 · 40 · 50 · 60 fps, never above 60. **Default 30.**
- **Motorised controls.** The controls are physical and are never greyed out: in AUTO they cannot be worked by hand and turn by themselves to the positions the governor sets, like a mixing desk's motorised faders (a servo sound through part-audio is welcome).
- **A hinged clear plastic cover** over the manual controls, lifted and closed by the player as a physical touch, independent of HAND and AUTO.
- **A paper trace recorder** in its own frame in the Esc menu: a pen trace of recent frame rates on moving chart paper, **switched off by default**; one of the game's own chart recorders (reuse `period-instruments.ts`'s if it fits), not a screen.

Until 157 lands, AUTO has an interface the governor will drive (a setter per control and a "position now" for the motor), driven in tests and a dev toggle.

## Not decided yet

Whether the presets stay as a lever on the panel in HAND, or go in favour of the individual controls (ask the owner).

## Acceptance

- The panel opens from the Esc menu, its controls work in HAND, the lamp lights and the controls lock in AUTO, and driven positions move the knobs visibly.
- The cover lifts and closes; the recorder, switched on, draws the frame-rate trace from 154's measurement (or a stand-in before it).
- Layout and state logic in `logic/`, tested; within the component benchmark's budget.

## Coordination

Can start now (layout, controls, cover, recorder); the live trace needs 154's measurement, and AUTO's behaviour needs 157.

## Records

A plan in `doc/plans/156-graphics-panel.md`; `TODO.md`; `CHANGELOG.md` under Unreleased once built; a diary entry.
