# 204 — Water that looks as its chemistry is: colour, murk and silt

Brief: `doc/prompts/204-water-that-looks-its-chemistry.md`. The owner, 2026-11-04. Builds on 203's optics and `doc/research/pool-water-appearance-when-wrong.md`. One optical model for all water: Beer–Lambert absorption plus scattering, extended from fixed constants to **per-pool values computed from the world state** — each substance adds absorption (colour) and scattering (murk). Clean water is blue with distance; suspended solids make it foggy; dissolved colour tints it; the coefficients add.

## Design

- **Per-pool coefficients** (pure, `water-optics.ts`, tested): from the model today — suspended solids → scattering (≈ 1 m⁻¹ per NTU), bathers' organics → a faint yellow-grey absorption cast. Later substances are more coefficients, never special cases.
- **One formula** drives what is seen from above (tiles), from below (203's fog) and through the portholes: `poolBeer(absorption, scattering, glow, colour, path)`.
- **Visual choice settled by the owner, 2026-11-05:** keep analytic, distance-based water fog as the base. For particulate above a tunable clean-water threshold, add vertical translucent Perlin-noise silt planes, purely visual. Select at most three distant candidate planes whose faces are near perpendicular to the view direction; fade near or edge-on planes and crossfade candidates as the camera turns. Drift the noise slowly sideways across the pool. Scale opacity with suspended solids. Draw no planes for clean water or on Low quality.

## Done (pure, tested)

- `SCATTER_PER_NTU = 1` (m⁻¹ per NTU); `greenBeam(ntu)` = green absorption + turbidity; `visibility(c)` ≈ 4.8/c.
- `turbidityOptics(ntu)` → the base absorption and the scattering a turbidity adds.
- `conditionOptics(condition)` → a pool's absorption (base + organics' yellow-grey cast) and scattering (its solids as NTU).
- `poolBeer(absorption, scattering, glow, colour, path)` — a colour through `path` metres of the pool's own water.
- Tests (11 passing in `water-optics.test.ts`): clean water identical to today; 1 m⁻¹ per NTU; the PWTAG visual test at 0.5 NTU (visibility ≈ 8 m, deep floor shows), 2 NTU (≈ 2.3 m, deep floor lost), 10 NTU (≈ half a metre); polluted water's scatter + yellow cast.

## Pending (rendering)

Upload the per-pool uniforms and shade above/below/portholes within the benchmark. Add the optional visual silt planes with a small candidate set and a three-plane draw cap. Compare clean, threshold and dirty states from above, below and through portholes in a browser; tune the threshold, near distance, angle fade, drift speed and opacity for legibility without popping. Verify the Low-quality fog-only path and frame budget.

## Records

TODO.md; CHANGELOG under Unreleased; a diary entry.
