# 203 — Underwater rendering: depth fog and the distorted surface seen from below

Brief: `doc/prompts/203-underwater-rendering.md`. The owner, 2026-11-04. When the camera is under the water, or looks through a porthole into a pool, the water should look like water: blue depth fog by the water-optics formula, and the air side seen through a rippling surface (Snell's window). Separate from swimming (202).

## Design

One formula throughout, `water-optics.ts` (never a hand-tuned fog colour): Beer–Lambert `transmittance(path)` per colour + the scattered glow `SCATTER`, used by the deep ends' floor tiles and now by underwater fog and the portholes.

- **Depth fog (under water, or through a porthole).** A colour at the end of a sight line that has `path` metres of water in it becomes `waterFog(colour, path)`: what the water keeps plus its faint glow. The path is `waterPathLength(a, b, waterY)` — the part of the segment below the water plane — for a camera under the surface or a porthole whose sight crosses into the pool.
- **Surface from below.** The pool's underside shows the air side refracted through the ripples, within Snell's window (`snellsWindow()` ≈ 97°, total internal reflection outside, mirroring the pool below), using the vendored `WaterBelow.frag` / `RoundedBoxWaterBelow.frag`.
- **Portholes** (the Olympic viewing gallery): the gallery is air, the pool beyond is under water, so the fog applies through the glass and looking up shows the hall distorted by the ripples.
- **When it applies:** chosen by where the line of sight is (above/below the water plane, inside/outside a basin) from the basin's water level — not per room or per shot; the title's underwater shot (`OLYMPIC_ROLL_DOLLY_ZOOM`) gets it because its camera is under water.
- **Cost:** within the component benchmark and the frame-rate missions; on Low, fog only, without the refracted surface.

## Done (pure, tested)

- `waterPathLength(a, b, waterY)` — the underwater part of a line of sight (whole below, none above, the submerged part across a crossing surface).
- `waterFog(colour, path)` — a colour through `path` metres of water: keeps + glow (the same formula `throughWater` uses, for an arbitrary path).
- `snellsWindow()` — the full angle of the air side seen above, ≈ 97°.
- Tests in `water-optics.test.ts` (7 passing): Beer–Lambert per metre, path lengthening with a flatter view, turquoise-to-deep-blue tile, caustic focus, the water-path length across a crossing surface, fog fading toward the glow, and Snell's window ≈ 97°.

## Pending (rendering)

The fog pass and the surface-from-below in the pool's shaders, wired to the title's underwater shot and the gallery portholes, within the benchmark. This is a visual change — needs a browser to confirm the look (screenshots before/after). I have no rendering, so I'll wire it but need the owner or a browser agent to verify.

## Records

TODO.md; CHANGELOG under Unreleased; diary entry. Clean-up: the mission-151 special "tank roof deck" marker mesh is now against the "surfaces from traits and geometry, never special rules" rule (185/`no-special-surface-rules.test.ts`) and is a follow-up, not part of 203.
