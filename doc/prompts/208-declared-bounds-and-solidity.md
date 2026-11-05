# Mission 208: declared bounds and the solid trait

Status: stage 1 (bounds models for tops, the desk, the CAD BOUNDS toggle) done 2026-11-05; stage 2 (the solid trait and its opt-outs) open.

## Why

Derived surfaces (mission 175) cast rays down on an object's body to find its top. For simple shapes that is needless work and can be wrong: the engineer's desk's derived top comes out 0.73 m high but only 0.62 m deep where the desk is 0.8 m (nicole_buruaah, 319b9d3c). The owner, 2026-11-05: as an object has a high-poly and a low-poly version, it may have a bounding version; a simple object should simply be a box, and the game should not have to raycast a desk.

## The owner's rulings so far (2026-11-05)

1. **Bounds mode is a trait facet.** How an object's shape is treated is chosen by trait. The default (no bounds trait) is today's derived method, rays cast on its body; a kind may instead be bounded by a box (or a cylinder).
2. **A box may be declared or fitted.** A box-bounded kind with no box given has one fitted to its mesh by the game; but a box should normally be provided.
3. **Blocking from the side is its own trait, separate from supportable**, since supportable says only how the top behaves.
4. **That trait is `solid`, and it is opt-out**: most big, robust things exclude movement on every axis, so solid is the default. "Solid just means its boundaries function as a shape without holes."
5. **Solid implies supportable.**
6. Real objects are nearly all solid, but for gameplay many will not have their thickness or bulk modelled. A desk and a tank are solid. A desk made as a slab on pole legs, which someone could crawl under, would be supportable but not solid.
7. **Opting out of solid is by a named trait**, each with its gameplay reason: `open-frame` (a slab on pole legs: crawled under, passed through at the sides, still supportable) and perhaps `hollow`. There may be more later; this mission defines only solid and the simple bounds behaviour, plus whatever opt-out the first non-solid kind needs.
8. If pools or gas leaks become a thing, `liquid` and `gas` may be added as traits later (not this mission).

## What exists already (check before building)

- The `form` facet in `src/game/plant/traits.ts`: `box-like` ("its bounding box is its shape"), `cylindrical` (with `axis`), `panel-like`, `run-like` (walk-through). This is close to the bounds facet; decide whether to extend it or add a new one.
- `KindSolidShape` in `src/game/plant/equipment-kinds.ts`: `{type: 'bounds'}` (fitted) or `{type: 'box', width, height, depth, centre?}` (declared), reachable today only through a kind's older declared affordances, not through a trait.
- `supportable`'s `surface` meta (`raycast` or `plane` with `surfaceY`), which a declared box would largely replace.
- `solid` is currently an affordance derived from form (`run-like` passes through, all else solid), and `surface` follows it; `walkable` implies `supportable`. Trait implication (`implies`) already exists.
- Derived surfaces: `src/toolkit/gallery/views/derived-surfaces.ts` (bodyMeshes, markNonBody, portables skipped since 319b9d3c).

## Stage 1, done (the owner, 2026-11-05: "start work on this now")

The owner's refinement: the bounds live in a **bounds model**, a third version of an object beside its high- and low-poly ones, typically simpler than low; bounds models are made only for the objects where they matter, starting with the desk; the CAD view must show it; and a trait decides whether it does anything.

- `src/toolkit/components/core/logic/bounds-model.ts` (pure, tested): `BoundsPrimitive` (box, or cylinder on an axis), `boxBetween`, `primitiveTop`, `modelExtent`.
- `src/toolkit/components/core/views/bounds-model.ts`: `setBoundsModel` (called by the object's own builder), `boundsModelOf`, `findBoundsModel`, `createBoundsView` (the overlay).
- The primitive trait `bounds-model` (surface facet, implies supportable): with it, `derived-surfaces.ts` takes each shape's flat top through the object's world matrix and casts no rays; with it and no declared model, one box fitted to the body.
- The desk (`engineers-desk.ts`) declares its board, 1.6 × 0.8 m at 0.73 m; the `desk` composite carries `bounds-model` (set through `npm run audit -- trait edit`). Test in `room-equipment.test.ts`.
- The item audit page's CAD views have a BOUNDS toggle over HIGH or LOW: orange where declared, grey where a fitted box stands in.

## Stage 2, open

- The `solid` trait (opt-out, implies supportable), and its named opt-outs (`open-frame`, perhaps `hollow`); the walker's collision from the bounds model's solid shapes.
- A BOUNDS toggle in the magic room, beside its POLY knob.
- A test that a declared model still fits its drawn object.
- The desk's own model is loaded asynchronously and is missing from its CAD views (only its PC, shelf, chair and carton show): a CAD fault from before this mission.

## Open questions

- Extend the `form` facet (give `box-like` and `cylindrical` sizes) or add a separate bounds facet? Recommendation: extend `form`, since it already says "its bounding box is its shape"; a separate facet would duplicate it.
- Does `run-like` stay walk-through as now, i.e. is it simply not solid?
- Do the declared bounds also replace `supportable`'s `plane` meta, retiring it?
- Coordinate with nicole_buruaah (holding traits, derived surfaces) and farhad_taphrale (176, trait classification) before claiming files.
