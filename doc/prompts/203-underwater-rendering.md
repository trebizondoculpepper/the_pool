# 203: Underwater rendering: depth fog and the distorted surface seen from below

The owner, 2026-11-04. Brief only; not started until the owner says. A rendering mission, separate from swimming (202, parked).

## Why (the owner)

When the camera is under the water (briefly, as in the title sequence's underwater Olympic dolly zoom, `OLYMPIC_ROLL_DOLLY_ZOOM` in `src/toolkit/title/logic/attract-sequence.ts`), the water should look like water: a blue fog that thickens with distance, and the air side seen through the rippling surface, distorted. **The reason it matters:** from the Olympic's underwater viewing gallery (`gallery` in `src/toolkit/gallery/logic/pool-halls.ts`: round windows through the pool's wall), looking through the portholes into the pool, the ripples should distort how the air side of the pool looks.

## What there is

- **The depth formula** (worked out long ago for how deep ends look): `src/toolkit/components/pool/logic/water-optics.ts`: Beer–Lambert absorption (`ABSORPTION`, per metre, red fastest, blue least), the scattered blue-green glow (`SCATTER`), `transmittance(metres)`, `throughWater`, `WATER_IOR`; used by the tile shader in `components/pool/views/pool-surfaces.ts`.
- **A surface-from-below shader** in the vendored water renderer (`src/toolkit/vendor/threejs-water/shaders/WaterBelow.frag`, `RoundedBoxWaterBelow.frag`), with refraction through a simulated rippling heightfield.

## What to build

1. **Depth fog under water:** whenever the line of sight runs through water (the camera under the surface, or looking through a porthole into the pool), what is seen is attenuated and tinted by the same formula as the deep ends: `transmittance(path)` per colour along the water path, plus the scattered glow, so a far wall fades to the pool's blue exactly as a deep end's floor does from above. One formula, from `water-optics.ts`, never a separate hand-tuned fog colour.
2. **The surface seen from below:** the underside of the water surface shows the air side (the hall, its lights, its roof) refracted through the ripples (Snell's window, about 97° across, with total internal reflection outside it, mirroring the pool below), distorted by the same moving surface the pool shows from above, so the ripples are one simulation seen from both sides.
3. **Through the portholes:** from the viewing gallery, the porthole's glass is the boundary: the gallery is in air, the pool beyond is under water, so (1) and (2) apply to what is seen through it: the pool's far wall fades blue with distance, and looking up through the porthole at the surface shows the hall distorted by the ripples.
4. **When it applies:** chosen by where the line of sight is (above or below the water's plane, inside or outside a basin), from the basin's water level, not per room or per shot; the title sequence's underwater shot gets it because its camera is under the water.
5. **Cost:** within the component benchmark's budget and the frame-rate missions' (154–157); on Low quality, the fog alone, without the refracted surface, if the surface is too costly.

## Acceptance

- The title sequence's underwater shot shows blue depth fog by the water-optics formula and the hall seen through a rippling Snell's window above.
- From the Olympic's viewing gallery, the pool through a porthole fades blue with distance, and the air side above the surface is distorted by the ripples, moving as the surface moves.
- Pure parts (the water-path length for a line of sight, the attenuation and glow per colour, the Snell's-window angle) in `logic/` with tests; screenshots before and after in the plan.

## Records

A plan in `doc/plans/203-underwater-rendering.md`; `TODO.md`; `CHANGELOG.md` under Unreleased; a diary entry.
