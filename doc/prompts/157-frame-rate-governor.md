# 157: The frame-rate governor

The owner, 2026-11-04. Brief only; not started until the owner says. Split from the constant-frame-rate work (154–157). Read `CLAUDE.md` and the research `doc/research/constant-frame-rate.md`, then 154 and 156.

## Why

Players report about 10 fps on weak machines. Constant frame rate replaces the Low, Medium and High presets as the normal way to play (the owner, 2026-11-04): the game measures itself and adjusts its own cost to hold the player's target.

## What it is (the owner's decisions)

- **Holds the target** set on 156's panel (30, 40, 50 or 60; 30 by default), in AUTO only.
- **Adjusts everything worth adjusting, both ways:** resolution; the effects ladder (ambient occlusion, bloom, shadow quality, pool refraction, antialiasing); the rooms seen through doorways (lower resolution, less often); services ceiling density; level of detail and draw distances. With headroom it raises quality as well as lowering it.
- **A readability floor for resolution:** the lowest render scale at which a typical panel's text is still sharp at arm's length, measured once on a test board in dev0 and fixed in code; below it the governor cuts other things, never resolution.
- **The controller:** a smoothed frame time, a dead band round the target, quantised steps, a rate limit between changes, fast down and slow up (the research's section 2). It tells a GPU-bound frame from a CPU-bound one and stops lowering what does not help; holds still while a room loads; starts afresh on entering a room. Pixel-ratio changes reallocate render targets, so changes stay rare (or draw into a fixed target at a variable viewport).
- **Drives 156's motorised controls,** so the panel shows what it has chosen.

## Not decided yet

Whether frame-rate changes reach the event log or the bug report (`copyReport`).

## Acceptance

- On a throttled browser in AUTO the game holds its target within the dead band, and the panel's controls turn to follow; in HAND it does nothing.
- Resolution never falls below the measured floor.
- The controller and the ladder are pure logic in `logic/`, tested with recorded frame-time series; within the component benchmark's budget.
- `TODO.md`'s graphics presets item's remaining work (dynamic resolution, frame cap, auto-detect, readout) closed or moved here.

## Coordination

Needs 154 (measurement, adjust and render stages) and 156 (the panel); the controller logic and the dev0 readability measurement can start now.

## Records

A plan in `doc/plans/157-frame-rate-governor.md`; `TODO.md`; `CHANGELOG.md` under Unreleased once built; `doc/agent-tooling.md` if a debugging tool is added; a diary entry.
