# 135: High and low poly versions, and visual cost

The owner, 2026-11-02: a new mission, separate from 130 and 133, which it extends. Brief only; not started until the owner says, and after 130 (the item audit and its magic room) and 133 (CAD views). Read `CLAUDE.md`, then 126, 130, 131 and 133.

## What it adds

- **Two versions of every drawn kind:** its full (high-poly) version, the view builder, and its low-poly version: the far version the museum already draws beyond 30 m (`createFarVersion`, `src/toolkit/components/core/views/far-version.ts`: flat colours merged into a few meshes, screens as dark glass, nothing that moves). Where a kind has a hand-made low-poly version of its own, that one is shown instead.
- **In the magic room (130):** the signpost's panel gains a HIGH · LOW selector that swaps the item between its two versions, and a small readout of the shown version's visual cost.
- **On the item audit page (130):** both versions' visual cost side by side, near the top.
- **On the CAD views (133):** a HIGH · LOW selector showing the four views of either version, each version's images cached separately, each carrying its cost, so the two can be compared at a glance.

## Visual cost

Measured as the component benchmark measures it (`BenchSample` in `src/toolkit/gallery/logic/component-bench.ts`):

- triangles, draw calls, materials, textures and their size on the GPU;
- whether it updates every frame, and its update time;
- its budget status: within budget, over, or listed in `KNOWN_OVER_BUDGET` with its reason;
- its weight in the game, where the catalogue counts it (126): copies times cost, busy rooms counted double as `usageWeight` does, so the kinds that cost most overall stand out, not only the heaviest single objects.

The game-wide catalogue (126) can then sort and filter its Game objects by visual cost and by weight. The figures are measured live, when the magic room opens (the owner, 2026-11-02), by the benchmark's own measurement of the item as it is built there, for both versions; the audit page and the CAD views show the figures from the item's last magic-room measurement, with when it was taken, and offer to open the room to measure afresh.

## Acceptance

- The weather station console, a valve, a pump, a boiler and a mimic board each switch between HIGH and LOW in their magic rooms and CAD views, and show both versions' costs.
- The figures agree with the component benchmark's for the same kind.
- Pure parts (cost summaries, budget status, weight) live in `logic/` with tests beside them.

## Records

The plan in `doc/plans/135-poly-versions-and-visual-cost.md`; `TODO.md`; `CHANGELOG.md` under Unreleased once built; a diary entry.
