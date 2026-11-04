# Mission 203 — underwater rendering: depth fog and the distorted surface seen from below (2026-11-04)

The owner, 2026-11-04: when the camera is under the water, or looks through a porthole into a pool, the water should look like water — blue depth fog by the water-optics formula, and the air side seen through a rippling surface. A rendering mission, separate from swimming (202).

## This session

Claimed and broadcast. Surveyed the optics (`water-optics.ts` already has Beer–Lambert `transmittance`, `SCATTER`, `WATER_IOR`) and the vendored `WaterBelow` shader. Implemented and tested the **pure parts** the brief's acceptance asks for:

- `waterPathLength(a, b, waterY)` — the underwater length of a line of sight (whole below, none above, the submerged part where a porthole's sight crosses the surface).
- `waterFog(colour, path)` — a colour through `path` metres of water: what the water keeps plus its blue-green glow (the same formula the deep-end tiles use, for an arbitrary path).
- `snellsWindow()` — the ≈ 97° cone of air a swimmer sees above (from `WATER_IOR`).

All in `water-optics.ts`, tested (7 passing). Plan written (`doc/plans/203-underwater-rendering.md`).

## Not done in this session

The **rendering** — the depth-fog pass and the surface-from-below (via the vendored `WaterBelow.frag` / `RoundedBoxWaterBelow.frag`) wired to the title sequence's underwater shot and the Olympic viewing gallery's portholes, within the component benchmark. This is a visual change: I have no rendering, so I can't confirm the look. It needs the owner or a browser agent to verify (screenshots before/after). I'll wire it once the pure parts are merged and I have a way to verify, or hand it to whoever can.

## Note

Mission 151's special "tank roof deck" marker-mesh-and-name lookup is now against the new AGENTS.md rule "surfaces come from traits and geometry, never special rules" (185, `no-special-surface-rules.test.ts`). That is a follow-up, separate from 203.
