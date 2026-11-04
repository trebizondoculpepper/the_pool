# 204: Water that looks as its chemistry is: colour, murk and silt

The owner, 2026-11-04. Brief only; not started until the owner says. Builds on 203 (underwater rendering: depth fog by the water-optics formula) and the research `doc/research/pool-water-appearance-when-wrong.md` (2026-10-22), which has the optics, each condition's look, and a recommended mapping from the model's state to the shader.

## Why (the owner)

The water is perfectly clear today, but the game already models its chemistry, and what is dissolved or suspended in water changes how it looks: dirty water is foggy, very dirty water brown or silty, and some chemicals tint it other colours. The player should be able to see that something is wrong with the water before any instrument says so (PWTAG: you must be able to see the deep end's floor clearly from the pool surround; above 0.5 NTU the water is unacceptable).

## The idea

One optical model for all water, extending `src/toolkit/components/pool/logic/water-optics.ts` (Beer–Lambert absorption plus the scattered glow) from fixed constants to **per-pool values computed from the world state**: each substance adds its own absorption (which sets the colour) and scattering (which sets the murk, washing the view toward the water's own colour and blurring detail). Distance makes clean water bluer; suspended particles make it foggier; dissolved colour tints it; they combine because the coefficients add. This one model drives what is seen from above (the tiles through the water), from below (203's fog), and through the portholes.

- **From the model today** (`src/game/water/water-condition.ts`): suspended solids (`solids`, and `turbidity` = NTU) → scattering (about 1 m⁻¹ per NTU, the research's rule of thumb); bathers' pollution (`organics`) → a faint yellow-grey cast.
- **Later, as the model gains them** (the research's list): algae (green, then blue-green), dissolved organic colour (tea-brown tannins), iron (rust brown), manganese (grey-brown), copper (green-blue), silt (brown, settling toward the floor), foam and surface films. Each is a coefficient, not a special case.
- **Pure:** the per-pool coefficients from the water's condition, in `logic/`, tested (clean water stays as now; 0.5 NTU still shows the deep floor; 2 NTU loses it; 10 NTU is about half a metre of visibility); the views only upload uniforms.

## The owner's layers idea, and the choice to make

The owner suggested rendering a series of translucent, semi-opaque layers into the body of water to stand in for suspended particles. Two ways:

1. **Analytic** (the research's recommendation): integrate the absorption and scattering along each line of sight in the shader, per pixel, from the path length through the water: exact, cheap, smooth, and one formula for clean and dirty water alike.
2. **Layered slices** (the owner's idea): a stack of camera-facing or horizontal semi-transparent slices through the water volume, each tinted by the coefficients: cheaper to reason about, can show silt settling in bands or a cloud drifting, but costs overdraw and can band.

Proposed: the analytic model as the base, with a few slices added only where the look needs structure the analytic model cannot show (silt settling toward the floor, a drifting cloud after a backwash). The owner decides.

## Acceptance

- A pool's water changes appearance with its condition in the world state: clean water as today; rising turbidity hides the deep floor (PWTAG's test fails visibly); dirty water reads brown or silty.
- Seen from above, from below (203) and through the portholes, by the same coefficients.
- Within the frame-rate missions' budgets; on Low quality, the analytic model alone.

## Records

A plan in `doc/plans/204-water-appearance.md`; `TODO.md`; `CHANGELOG.md` under Unreleased; a diary entry.
