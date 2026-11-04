# Constant frame rate: research

Status: research only (2026-11-04, for the owner), nothing implemented. Follows [graphics quality presets](graphics-quality-presets.md), whose Low, Medium and High presets are built; this covers how games hold a steady frame rate on top of a preset, and how Pool Plant could.

## Contents

- What "constant" means
- How games traditionally do it
- Where Pool Plant stands
- A proposed design
- Risks
- Open questions for the owner
- Sources

## What "constant" means

A steady frame rate is about even frame _pacing_, not the highest average. A locked 30 fps with every frame 33 ms apart feels smoother than an average of 50 that swings between 40 and 60, because the eye notices the variation (judder) more than the rate. So the aim is: choose a target the machine can hold (60, or 30 on a weak machine), never go over it, and adjust the cost of each frame so it fits under the target with headroom.

## How games traditionally do it

1. **A target and a cap, synced to the display.** Consoles and most PC games lock to 60 or 30 (a divisor of the display's refresh), with v-sync so frames are shown on refresh boundaries. A cap stops a fast machine running hot and gives the governor below headroom to measure against. In a browser, `requestAnimationFrame` is already synced to the display; a 30 fps cap means drawing on every second callback.
2. **Dynamic resolution scaling (DRS), the main tool.** Each frame's render time is measured, and the resolution the 3D scene is drawn at is lowered when it runs over budget and raised again when there is room, between a floor and a ceiling (say 50% to 100%). The text and the HUD stay sharp. Unity, Unreal and every console engine do it. The controller is a small feedback loop with stabilisers so it does not oscillate:
   - a smoothed frame time (an exponential moving average, a new sample weighted about 0.2);
   - a dead band around the target (about ±10%) where nothing changes;
   - quantised steps (5% of scale at a time);
   - a rate limit (at least about 8 frames between changes);
   - fast down, slow up: drop at once on a spike, climb only after a sustained run of fast frames.
3. **Adaptive quality, after resolution.** When the floor of resolution is reached and frames are still slow, the next cheapest effects step down one at a time (ambient occlusion, bloom, shadow-map size, reflections), and come back in reverse order. This is the presets' own ladder, walked automatically.
4. **Simulation on a fixed step, apart from drawing** ("Fix Your Timestep"). The simulation advances in constant slices (say 1/20 s) taken from an accumulator of real time, however fast the screen redraws, so the world behaves the same at 20 fps as at 60; the accumulator is capped (about 0.25 s) so a stall slows the game instead of spiralling. Drawing interpolates between steps where motion needs it.
5. **Spreading work across frames (time slicing).** Costly periodic work (redrawing displays, path searches, background rooms) takes turns, a few items per frame within a fixed budget, so no single frame spikes.
6. **Not drawing what cannot be seen.** Level of detail (simpler models far away), frustum and occlusion culling, and drawing distant views less often or at lower resolution.
7. **Measuring before acting.** GPU timer queries (WebGL's `EXT_disjoint_timer_query_webgl2`, where the browser offers it) say how long the GPU took; otherwise the interval between `requestAnimationFrame` callbacks is used. CPU-bound and GPU-bound slowdowns need different answers: lowering resolution helps only a GPU-bound frame.

## Where Pool Plant stands

- **One place to govern every frame.** Every renderer comes from `createRenderer` in `src/toolkit/components/core/parts/render-style.ts`, which already wraps `setAnimationLoop` (about line 435) and multiplies the pixel ratio by `renderScale(renderLevel)`. A frame governor and DRS can live there and reach every room, composer and doorway underlay.
- **Resolution is already adjustable live** (Render quality, the presets' pixel-ratio cap), so DRS is a controller driving an existing knob, not new rendering.
- **The simulation uses a variable step:** `stepWorld(world, delta)` (`src/game/world.ts`, about line 1618) is given each frame's delta, and some rooms clamp it themselves (`Math.min(delta, 1)` in the boiler room). A slow frame means a bigger step, and frame rate can change outcomes. A fixed step with a capped accumulator would make it independent of frame rate.
- **Displays already redraw only on change** (mission 094), and run at no more than 10 Hz, which is time slicing in part; there is no frame-wide budget yet.
- **Doorway underlays double the cost:** the next room is drawn as a full second render at the same resolution. Drawing it at lower resolution, or less often, is the cheapest large win after DRS.
- **No frame-time readout or GPU timing** exists yet.

## A proposed design

In order of value per effort:

1. **Frame-time meter** (pure logic in `logic/`, tested): a smoothed frame time, 95th percentile and dropped-frame count from the animation loop's timestamps, with GPU timer queries when available. Shown by a `?fps` overlay and a settings toggle. Everything else depends on measuring.
2. **Frame cap:** a target of 60 or 30 (or display rate), applied in the wrapped loop by skipping callbacks.
3. **DRS controller** (pure logic, tested with recorded frame-time series): the stabilised feedback loop above, driving the render scale between a floor and the preset's ceiling. Holds the scale while a room is loading and resets it on entering a room.
4. **Adaptive quality ladder:** when DRS sits at its floor for a few seconds, step the preset's effects down one rung; climb back after a sustained good run. Announced quietly in the readout, not to the player.
5. **Cheaper doorway underlays:** the room beyond drawn at half resolution and every other frame.
6. **Fixed simulation step:** `stepWorld` run in constant slices from a capped accumulator, so the plant's behaviour no longer depends on frame rate. Separate from rendering and testable on its own; may change some timings that tests pin.

## Risks

- **The pixel ratio change reallocates buffers** in three.js (`setPixelRatio` resizes the canvas and composers' targets). Changing it every few frames can itself cause hitches; a quantised step and the rate limit keep changes rare, and a viewport-based scale (draw into a fixed-size target, use part of it) avoids reallocation if needed.
- **CPU-bound frames** (many components updating) gain nothing from lower resolution; the meter must tell the two apart (GPU timing, or a frame whose resolution drop brought no gain) and stop lowering.
- **Instruments must stay readable:** a low scale blurs dials and LCDs, which are the game. The floor should be set so text on a panel at arm's length stays legible.
- **Browser timing is coarse** and GPU timer queries are not available everywhere (Safari lacks them); the fallback measures whole frame intervals.
- **A fixed step changes simulation timing**, which tests and saved games may depend on.

## Open questions for the owner

1. Should dynamic resolution be on by default for every player, or only on Low and Medium?
2. What should the target be: 60 fps where possible and 30 otherwise, or 30 always on weak machines, or the player's choice?
3. May the adaptive ladder turn effects off by itself, or should it only change resolution and leave the preset alone?
4. How low may resolution go before instruments become unreadable (a floor such as 50%), or should it never drop below what keeps panel text sharp at arm's length?
5. Should the simulation move to a fixed step now, as part of this, or be a separate mission?
6. Should the FPS readout be a player setting, a `?fps` URL option, or both?

## Sources

- Unity manual, dynamic resolution control: https://docs.unity3d.com/Manual/DynamicResolution-control.html
- Hilo3d, `DynamicResolutionOptions` (hysteresis, smoothing, step, rate limit): https://hilo3d.js.org/docs/interfaces/Hilo3d.DynamicResolutionOptions.html
- How-To Geek, what is dynamic resolution scaling: https://www.howtogeek.com/764408/what-is-dynamic-resolution-scaling-drs/
- React Three Fiber, scaling performance (`regress`, adaptive pixel ratio): https://website-h0nc5tb9m-pmndrs.vercel.app/react-three-fiber/advanced/scaling-performance
- three.js forum, restricting viewport size and stepping pixel ratio to a target: https://discourse.threejs.org/t/restricting-viewport-size-for-mobile/7270
- three.js forum, lowering a render target's pixel ratio did not help: https://discourse.threejs.org/t/set-pixel-ratio-on-render-target-of-water-example-to-improve-performance/67150
- Glenn Fiedler, Fix Your Timestep: https://new.gafferongames.com/post/fix_your_timestep/
- Fixed timestep, spiral of death and accumulator caps: https://www.abratabia.com/game-architecture/fixed-timestep.php
