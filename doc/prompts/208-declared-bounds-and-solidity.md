# Mission 208: declared bounds and the solid trait

Status: stage 1 (bounds models for tops, the desk, the CAD BOUNDS toggle) done 2026-11-05; stage 2 (solidity by trait, the `open-frame` opt-out, collision from bounds models, the magic room's BOUNDS knob, a fit test) done 2026-11-06 (nicole_buruaah; see "Stage 2, done"). Collision for every other solid kind is mission 162.

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

## Stage 2, done (2026-11-06, nicole_buruaah)

- **Solid by default:** the resolver (`affordancesFromTraits`, `equipment-kinds.ts`) makes every kind solid unless it is decorative, `run-like` or the new `open-frame`. There is no `solid` trait to name: solid is what every kind is, and a kind opts out by a named trait with its own gameplay reason (rulings 4, 7).
- **`open-frame`** (surface facet, implies supportable, conflicts with walkable, needs a form): a slab on pole legs, passed under and beside, still holding what is put on it. No kind has it yet; the first non-solid kind takes it with `npm run -s audit -- set <kind> traits+=open-frame`.
- **Collision from bounds models:** `roomSolids` (`gallery/views/derived-surfaces.ts`) gives each placed object of a solid kind with `bounds-model` (and not walkable, whose edges are 182's drop rule) a floor-plan footprint per shape (`primitiveFootprint`, `blocksWalker` in `core/logic/bounds-model.ts`, pure, tested): the box round its turned corners, skipped where it is wholly overhead (above `SOLID_HEADROOM`, 2 m) or under the floor. The room factory merges them into every room's walker solids through `RoomTraits.solids` (`room-controller.ts`), so 211's throws rebound off them too. The engineer's desk's board is the first (test in `room-equipment.test.ts`).
- **The magic room's BOUNDS knob** (OFF · ON) beside POLY: the item's declared model in orange, or a fitted box in grey.
- **A fit test:** `modelFits` (pure) checks a declared model lies within its drawn object and reaches its top; the desk's is checked against the size its library model is fitted to (`engineers-desk.test.ts`).
- **Not done here:** every other solid kind's collision (fitted boxes, height bands, rooms' own footprints removed) is mission 162; carried things stopped by solids (`carrySolids`) are 162 too.

## Open questions

Settled for stage 2 by taking the recommendations or the simplest choice (nicole_buruaah, 2026-11-06; the owner may overrule): the `form` facet is unchanged, and the opt-out is a surface trait; `run-like` stays walk-through (not solid); `supportable`'s `plane` meta stays.

- Extend the `form` facet (give `box-like` and `cylindrical` sizes) or add a separate bounds facet? Recommendation: extend `form`, since it already says "its bounding box is its shape"; a separate facet would duplicate it.
- Does `run-like` stay walk-through as now, i.e. is it simply not solid?
- Do the declared bounds also replace `supportable`'s `plane` meta, retiring it?
- Coordinate with nicole_buruaah (holding traits, derived surfaces) and farhad_taphrale (176, trait classification) before claiming files.
