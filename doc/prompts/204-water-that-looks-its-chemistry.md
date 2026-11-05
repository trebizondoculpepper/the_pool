# 204: Water that looks as its chemistry is: colour, murk and silt

The owner, 2026-11-04. Brief only; not started until the owner says. Builds on 203 (underwater rendering: depth fog by the water-optics formula) and the research `doc/research/pool-water-appearance-when-wrong.md` (2026-10-22), which has the optics, each condition's look, and a recommended mapping from the model's state to the shader.

## Why (the owner)

The water is perfectly clear today, but the game already models its chemistry, and what is dissolved or suspended in water changes how it looks: dirty water is foggy, very dirty water brown or silty, and some chemicals tint it other colours. The player should be able to see that something is wrong with the water before any instrument says so (PWTAG: you must be able to see the deep end's floor clearly from the pool surround; above 0.5 NTU the water is unacceptable).

## The idea

One optical model for all water, extending `src/toolkit/components/pool/logic/water-optics.ts` (Beer–Lambert absorption plus the scattered glow) from fixed constants to **per-pool values computed from the world state**: each substance adds its own absorption (which sets the colour) and scattering (which sets the murk, washing the view toward the water's own colour and blurring detail). Distance makes clean water bluer; suspended particles make it foggier; dissolved colour tints it; they combine because the coefficients add. This one model drives what is seen from above (the tiles through the water), from below (203's fog), and through the portholes.

- **From the model today** (`src/game/water/water-condition.ts`): suspended solids (`solids`, and `turbidity` = NTU) → scattering (about 1 m⁻¹ per NTU, the research's rule of thumb); bathers' pollution (`organics`) → a faint yellow-grey cast.
- **Later, as the model gains them** (the research's list): algae (green, then blue-green), dissolved organic colour (tea-brown tannins), iron (rust brown), manganese (grey-brown), copper (green-blue), silt (brown, settling toward the floor), foam and surface films. Each is a coefficient, not a special case.
- **Pure:** the per-pool coefficients from the water's condition, in `logic/`, tested (clean water stays as now; 0.5 NTU still shows the deep floor; 2 NTU loses it; 10 NTU is about half a metre of visibility); the views only upload uniforms.

## The owner's visual choice (settled 2026-11-05)

The owner suggested rendering a series of translucent, semi-opaque layers into the body of water to stand in for suspended particles. Two ways:

1. **Analytic** (the research's recommendation): integrate the absorption and scattering along each line of sight in the shader, per pixel, from the path length through the water: exact, cheap, smooth, and one formula for clean and dirty water alike.
2. **Layered slices** (the owner's idea): a stack of camera-facing or horizontal semi-transparent slices through the water volume, each tinted by the coefficients: cheaper to reason about, can show silt settling in bands or a cloud drifting, but costs overdraw and can band.

Use the existing analytic distance-based water fog as the base for overall loss of visibility. Add a small number of vertical, translucent Perlin-noise silt planes for visible structure in dirty water. The planes are purely visual: they do not change the water state or the game's interactions. Place candidate planes in the pool, then draw at most three sufficiently distant planes whose surfaces face the viewer most squarely (their normals roughly align with the view direction). Animate the noise slowly sideways, across an axis of the pool, recalling the Quake-style sky treatment but with vertical planes. Fade planes as they become edge-on or near, and crossfade selected planes as the camera turns so the choice does not pop. Their opacity increases with suspended particulates; draw none in clean water or below a tunable particulate threshold. The exact threshold, distances, drift speed and opacity are visual tuning values to settle in the browser, not new simulation variables. Low graphics quality may use the base fog alone.

## Acceptance

- A pool's water changes appearance with its condition in the world state: clean water as today; rising turbidity hides the deep floor (PWTAG's test fails visibly); dirty water reads brown or silty.
- Seen from above, from below (203) and through the portholes, by the same coefficients.
- Within the frame-rate missions' budgets; on Low quality, the analytic model alone.
- With particulate below the tuned threshold, no silt planes draw. In dirty water, no more than three sufficiently distant, nearly face-on vertical planes draw, with smooth selection as the camera turns.

## Records

A plan in `doc/plans/204-water-appearance.md`; `TODO.md`; `CHANGELOG.md` under Unreleased; a diary entry.
