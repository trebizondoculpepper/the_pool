# 155: The world on a fixed simulation step

The owner, 2026-11-04. Brief only; not started until the owner says. Split from the constant-frame-rate work (154–157). Read `CLAUDE.md`, `doc/plant-model.md` and the research `doc/research/constant-frame-rate.md` (section 4, "Fix Your Timestep").

## Why

`stepWorld(world, delta)` (`src/game/world.ts`, about line 1618) is given each frame's own length, and some rooms clamp it themselves (`Math.min(delta, 1)` in the boiler room). At 30 fps (157's default) the plant moves in bigger jumps than at 60, and its behaviour can differ. The owner wants the plant to behave identically at any frame rate.

## What it is

The world advances in constant slices (the step size settled in the plan) taken from an accumulator of real time, however fast the screen redraws, with the accumulator capped (about 0.25 s) so a stall slows the game instead of spiralling. Time acceleration (mission 059) multiplies the time fed in, not the slice. Views interpolate where motion would otherwise visibly step. The rooms' own delta clamps go.

## Acceptance

- A test shows the plant reaching the same state stepped at 30 fps and at 60 (and at a jittery mixture).
- The accumulator and its cap are pure logic in `logic/`, tested.
- Tests that pinned timings are corrected with the reason given; saved games still load.

## Coordination

Can start now, beside 154; when 154 lands, the accumulator runs in its world-step stage. Touches `world.ts` and plant timings: claim on the mailbox, and reserve a `WORLD_VERSION` if the save's shape changes.

## Records

A plan in `doc/plans/155-fixed-simulation-step.md`; `TODO.md`; `CHANGELOG.md` under Unreleased once built; a diary entry.
