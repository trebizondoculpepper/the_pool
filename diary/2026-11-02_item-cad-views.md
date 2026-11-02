# Development Diary Entry - 2026-11-02

## Context

- **Date**: 2026-11-02 13:30 UTC
- **Branch**: main
- **Commit**: 587ac29f (magic room), then mission 133's commit
- **Contributors**: Claude Code + the owner

## Problem Statement

The owner asked for two things after mission 130: the magic room polished to read as a CAD sheet (a 1 m grid with 10 cm subdivisions on floor, walls and ceiling, centimetre graph paper on a wall item's stub, flat light, an axis triad), and mission 133, CAD views (TOP, FRONT, SIDE, PERSPECTIVE) on each item audit page, rendered in the browser and cached so they are never stale. Scope: machinery only, proved on the weather station console, the boiler cascade and the earthing terminal.

## Our Approach

One shared sheet look (`views/cad-sheet.ts`, grid styles in `logic/cad-views.ts`) used by both. The grid is a single metre tile drawn once on a canvas and repeated, its texture offset worked out so lines fall on whole world metres. The CAD views reuse 130's adapters and draw everything off-screen in one renderer, then keep PNG data URLs in IndexedDB.

## Implementation

The magic room's walls straddle the room's bounds, so the first grid planes were hidden inside them: they had to stand half a wall's thickness in. The offset maths also had its sign wrong at first; the test caught it. For the cache key, the dev server's build id is fixed while it runs, so the builder's identity is a fingerprint of the built object. Hashing world matrices made the boiler's key change every visit (a gauge needle moves with the clock); hashing local positions to the millimetre and scales, not rotations, made it stable while still catching a builder that moves, resizes, reshapes or recolours anything.

## Outcomes

- The magic room reads as a CAD sheet; the earthing terminal's stub of wall is graph paper you can measure it on.
- The three audit pages show four views each, the flat ones to one scale with sizes and a scale bar; a second visit reads the cache.
- `renderCadViews(adapter, { variant })` and `CAD_VIEW_MEASURES` are left for 135.

## Next Steps

Valves, pumps and mimic boards need magic adapters (130's follow-up) before they get views; curated representative looks for model-exhibit kinds.
