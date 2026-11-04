# 154: Constant frame rate, and one frame pipeline for every room

The owner, 2026-11-04. Brief only; not started until the owner says. Read `CLAUDE.md`, then the research `doc/research/constant-frame-rate.md` (how games hold a steady frame rate, and where the game stands), `doc/research/graphics-quality-presets.md` (the presets it supersedes), mission 096's settings panel (`src/toolkit/menus/logic/settings-panel.ts`, `views/settings-panel-view.ts`) and the face-grid rule in `CLAUDE.md`.

## Why

Players report the game is sometimes unplayable (about 10 fps). The Low, Medium and High presets were a first attempt at graphical consistency; holding a constant frame rate is a better one and less inconvenient (the owner): the game measures itself and adjusts its own cost to keep a steady rate, rather than the player guessing a preset.

## The decisions (the owner, 2026-11-04)

1. **Constant frame rate replaces the presets as the normal way to play.** Resolution is one of the things it adjusts.
2. **Targets of 30, 40, 50 or 60 fps**, never above 60. (On a 60 Hz display 40 and 50 cannot be evenly paced; offered anyway, and the meter shows how even the frames are.)
3. **One graphics panel.** Every manual graphics control (the preset lever, Render quality, the resolution cap, AO mode and the rest) moves to a single Penfold panel in the Esc menu, laid out on `face-grid` (`src/toolkit/components/core/logic/face-grid.ts`), designed with its debug overlay on and shipped with it off. It carries:
   - a **HAND · AUTO** knob: in AUTO the governor drives the panel; in HAND the controls work as today;
   - a **lock-out lamp**, a simulated neon indicator, lit while AUTO has the panel;
   - the **target selector** (30 · 40 · 50 · 60);
   - a hinged **clear plastic cover** over the manual controls, lifted and closed by the player as a physical touch only, independent of HAND and AUTO.
4. **Motorised controls.** The panel's controls are physical and cannot be greyed out: in AUTO they cannot be worked by hand, and they turn by themselves to follow what the governor sets, like a mixing desk's motorised faders (a servo sound through part-audio is welcome).
5. **Default: AUTO at 30 fps** for a new player.
6. **AUTO adjusts everything worth adjusting, both ways:** resolution; the effects ladder (ambient occlusion, bloom, shadow quality, pool refraction, antialiasing); the rooms seen through doorways (drawn at lower resolution and less often); services ceiling density; level of detail and draw distances. With headroom to spare it raises quality as well as lowering it.
7. **Resolution floor set by readability:** the lowest render scale at which a typical panel's text is still sharp at arm's length, measured once on a test board in dev0 and fixed in code. Below it AUTO cuts other things, never resolution.
8. **The simulation moves to a fixed step, in this mission.** `stepWorld` (`src/game/world.ts`) runs in constant slices from an accumulator of real time, capped so a stall slows the game rather than spiralling, so the plant behaves identically at 30 fps and 60.
9. **All rooms behave the same way** (the owner): one frame pipeline, below.
10. **The frame-rate meter is a paper trace recorder** in its frame in the Esc menu: it draws a strip of recent frame rates as a pen trace on moving chart paper, and is switched off by default (the player switches it on). It is one of the game's own chart recorders, not a screen.

## One frame pipeline for every room

Today each room owns its loop through `renderer.setAnimationLoop`, wrapped in `createRenderer` (`src/toolkit/components/core/parts/render-style.ts`, about line 435), and handles its own frame: its delta, its clicks, its world step, its drawing. Make one shared pipeline that every room's frame runs through, in a fixed order:

1. measure the frame (timestamps; GPU timer queries where the browser offers them);
2. input and object click actions, through the one control scheme;
3. world steps, in fixed slices;
4. views update from the world (the redraw-on-change rule of mission 094 stands);
5. the governor adjusts (scale, effects, distances), at a limited rate;
6. render, including doorway underlays at their own scale and cadence.

A room supplies its content and its per-frame view updates; it no longer owns its loop, its click handling or its rendering. Migrate every room to it; a room that cannot yet be migrated is listed with its reason.

## The governor

Pure logic in `logic/`, tested with recorded frame-time series: a smoothed frame time, a dead band around the target, quantised steps, a rate limit between changes, fast down and slow up, as the research describes. It tells a GPU-bound frame from a CPU-bound one (lowering resolution helps only the first) and stops lowering what does not help. It holds still while a room loads and starts afresh on entering a room. Changing the pixel ratio reallocates render targets; keep changes rare, or draw into a fixed target at a variable viewport if that hitches.

## Not decided yet

- What happens to the presets in HAND (kept as a lever on the graphics panel, or dropped in favour of the individual controls).
- Whether frame-rate changes reach the event log or the bug report (`copyReport`).

## Acceptance

- Every room runs through the one pipeline (or is listed as an exception with its reason); clicks, world stepping and rendering behave the same in all of them.
- The world steps in fixed slices; a test shows the plant reaches the same state stepped at 30 fps and at 60.
- In AUTO, on a throttled browser, the game holds its target within the dead band and the panel's controls turn to follow; in HAND they work by hand and the lamp is dark.
- Resolution never falls below the measured readability floor.
- The trace recorder, switched on, draws the recent frame rate; off by default.
- The graphics panel is laid out on `face-grid`, carries the Penfold mark, and its cover lifts and closes.
- Pure parts (the governor, the fixed-step accumulator, the effects ladder, the recorder's trace) in `logic/` with tests beside them; the governor within the component benchmark's budget.

## Records

A plan in `doc/plans/154-constant-frame-rate.md`; `TODO.md` (this supersedes the graphics presets item's remaining work); `CHANGELOG.md` under Unreleased once built; `doc/agent-tooling.md` for any `?fps`-style tool; a diary entry.
