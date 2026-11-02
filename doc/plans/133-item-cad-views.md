# 133: CAD views on the item audit page (plan)

The brief is `doc/prompts/133-item-cad-views.md` (the owner, 2026-11-02). This is how it is built.

## Scope

Machinery only (the owner, firm): proved on the weather station console, the condensing boilers in cascade and the main earthing terminal; no run across every kind, and no counts recorded.

## Where it sits

- `src/toolkit/gallery/views/cad-views.ts` registers a section in 130's `ITEM_AUDIT_SECTIONS` (`views/item-audit-page.ts`). `bench.ts` imports it before it runs the item audit page. A section may ask to be drawn near the top (`dataset.auditPlace = 'top'`): the page puts it before its first heading. This one does.
- A kind with a 3D form (130's `adapterFor`) gets four views: TOP, FRONT, SIDE (orthographic) and PERSPECTIVE. A kind without one gets its magic page (130) in the section's place, in a frame.

## How a view is drawn

- The item is built by its adapter, the game's own builder (130's `MagicAdapter.build`), at its representative state: the adapter's first curated look and first page, if it has any. Nothing is bound to the world or the save.
- One small off-screen renderer (one canvas, 480 px square) draws the four views and is disposed. The sheet is plain and light (`CAD_GRID.ground`), lit flat by the magic room's `cadLights` (`views/cad-sheet.ts`), with no room, no pipes and no neighbours.
- Orthographic views: TOP looks straight down with the item's front (+z, as 125's `front` mode takes it) at the bottom; FRONT looks along −z at its front; SIDE looks along −x at its right-hand side as seen from the front (third-angle). All three share one scale, the largest that fits the item's biggest dimension in a frame with a margin, so they are to scale with one another. Each carries its overall dimensions in millimetres and a scale bar of a round length.
- PERSPECTIVE stands off the front right corner, above the centre line, at the distance that fits the item's bounding sphere in the field of view.

## Pure parts (`logic/cad-views.ts`, tested beside it)

- `CAD_VIEWS`: the four views, their labels and their camera axes.
- `orthoFrame(bounds, view, pixels)`: the shared scale (`sheetScale`), the camera's centre, direction, up vector and half extent.
- `dimensionsMm(bounds)`, `viewDimensions(view, dims)`: overall sizes, rounded to the millimetre, and the pair each view shows.
- `scaleBar(pixelsPerMetre, maxPixels)`: the longest 1, 2 or 5 × 10ⁿ mm bar that fits.
- `perspectivePose(bounds, fovDeg)`: where the fourth camera stands.
- `fingerprint(parts)`, `cadCacheKey(...)`, `isFresh(entry, key)`: the cache's key and staleness.

## The cache (the owner, 2026-11-02)

Rendered in the browser the first time a kind's audit page opens, then kept in IndexedDB (`pool-plant-cad-views`, one entry a kind and variant), every access guarded: without IndexedDB the views are rendered every visit. An entry is keyed by the kind, the variant, `CAD_RENDER_VERSION` (the drawing code's own version), the game's version and build (`VITE_VERSION`, `VITE_BUILD`), and the builder's identity: a fingerprint of the built object itself (every mesh's name, vertex count, position sums and bounds, material colours and texture sizes). The development server's build id does not change while it runs, so a builder edited mid-session is caught by the fingerprint: whatever changes what the builder makes changes the key, and the views are remade. A stale image is never shown: an entry whose key differs is rendered afresh and replaced. While rendering, the page shows the four frames with a short note.

## Hook for 135

`renderCadViews(adapter, { variant })` is exported: 135 (HIGH/LOW poly and visual cost) can render a variant (`'high'`, `'low'`), which takes part in the cache key, and `CAD_VIEW_MEASURES` is a list of callbacks given the built object before it is drawn, for its counts and costs. Nothing of 135 is built here.

## Records

`TODO.md` (133 ticked), `CHANGELOG.md` under Unreleased, `doc/agent-tooling.md`'s 133 entry.
