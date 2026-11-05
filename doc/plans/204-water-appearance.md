# 204 — Water that looks as its chemistry is: colour, murk and silt

Brief: `doc/prompts/204-water-that-looks-its-chemistry.md`. The owner, 2026-11-04. Builds on 203's optics and `doc/research/pool-water-appearance-when-wrong.md`. One optical model for all water: Beer–Lambert absorption plus scattering, extended from fixed constants to **per-pool values computed from the world state** — each substance adds absorption (colour) and scattering (murk). Clean water is blue with distance; suspended solids make it foggy; dissolved colour tints it; the coefficients add.

## Design

- **Per-pool coefficients** (pure, `water-optics.ts`, tested): from the model today — suspended solids → scattering (≈ 1 m⁻¹ per NTU), bathers' organics → a faint yellow-grey absorption cast. Later substances are more coefficients, never special cases.
- **One formula** drives what is seen from above (tiles), from below (203's fog) and through the portholes: `poolBeer(absorption, scattering, glow, colour, path)`.
- **The choice:** analytic (integrate along the sight line, the research's recommendation) as the base; a few translucent slices only where structure is needed (silt settling, a drifting cloud). The owner decides — proposed: analytic base + only where needed.

## Done (pure, tested)

- `SCATTER_PER_NTU = 1` (m⁻¹ per NTU); `greenBeam(ntu)` = green absorption + turbidity; `visibility(c)` ≈ 4.8/c.
- `turbidityOptics(ntu)` → the base absorption and the scattering a turbidity adds.
- `conditionOptics(condition)` → a pool's absorption (base + organics' yellow-grey cast) and scattering (its solids as NTU).
- `poolBeer(absorption, scattering, glow, colour, path)` — a colour through `path` metres of the pool's own water.
- Tests (11 passing in `water-optics.test.ts`): clean water identical to today; 1 m⁻¹ per NTU; the PWTAG visual test at 0.5 NTU (visibility ≈ 8 m, deep floor shows), 2 NTU (≈ 2.3 m, deep floor lost), 10 NTU (≈ half a metre); polluted water's scatter + yellow cast.

## Pending (rendering)

Uploading the per-pool uniforms and shading above/below/portholes within the benchmark — a visual change; needs a browser to verify (screenshots before/after), which I don't have. Wire it and confirm with the owner or a browser agent.

## Records

TODO.md; CHANGELOG under Unreleased; a diary entry.
