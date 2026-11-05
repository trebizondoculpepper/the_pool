# Mission 204 — water that looks as its chemistry is: colour, murk and silt (2026-11-05)

The owner, 2026-11-04 (implemented the pure parts on 2026-11-05). The water is perfectly clear today though the game models its chemistry; this makes it look wrong when it is. Extends 203's underwater optics from fixed constants to per-pool values computed from the world state: each substance adds absorption (colour) and scattering (murk); the coefficients add; one model for above, below and the portholes.

## This session

Claimed and broadcast. Read the research (`pool-water-appearance-when-wrong.md`) and the model today (`water-condition.ts`). Implemented and tested the **pure per-pool coefficients** the brief's acceptance asks for, in `water-optics.ts`:

- `SCATTER_PER_NTU = 1` (m⁻¹ per NTU) and `greenBeam`/`visibility` (≈ 4.8/c).
- `turbidityOptics(ntu)` — the base absorption plus the scattering a turbidity adds.
- `conditionOptics(condition)` — a pool's absorption (base + bathers' organics as a faint yellow-grey cast) and the scattering of its suspended solids (NTU ≈ solids).
- `poolBeer(absorption, scattering, glow, colour, path)` — a colour through `path` metres of the pool's own water.

Tests (11 passing): clean water identical to today; 1 m⁻¹ per NTU; the PWTAG visual test (0.5 NTU ≈ 8 m visibility and the deep floor shows; 2 NTU ≈ 2.3 m, the deep floor goes; 10 NTU ≈ half a metre); polluted water's scatter and yellow cast. Plan written (`doc/plans/204-water-appearance.md`).

## Not done this session

The **rendering** — uploading the per-pool uniforms and shading the water above/below/through the portholes within the benchmark. A visual change I can't verify (no rendering); needs the owner or a browser agent to confirm (screenshots before/after), like 203's.

## Note

Requests one ruling from the owner (204's "choice to make"): the analytic model as the base, with a few translucent slices only where structure is needed — proposed this way in the plan.
