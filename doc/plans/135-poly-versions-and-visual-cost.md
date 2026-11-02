# 135: High and low poly versions, and visual cost (plan)

The brief is `doc/prompts/135-poly-versions-and-visual-cost.md` (the owner, 2026-11-02). This is how it is built.

## Scope

Machinery only (the owner, firm): proved on the weather station console, the condensing boilers in cascade and the main earthing terminal. No run across every kind, no counts or findings recorded. Where the catalogue shows cost it uses only figures already measured in this browser; nothing measures everything.

## The two versions

- **HIGH** is the kind's view builder, as the magic room (130) builds it through its adapter.
- **LOW** is the adapter's hand-made low-poly version where it has one (`MagicAdapter.buildLow`, none yet), else the far version the museum draws beyond 30 m (`createFarVersion`): flat colours merged into a few meshes, screens as dark glass, nothing that moves.

## Measuring (the owner, 2026-11-02: live, when the magic room opens, both versions)

`views/visual-cost.ts`, `measureVisualCost(renderer, object, update)`: the version drawn alone in a scene of its own, framed from in front as the component benchmark frames it, its shaders compiled first (a program still compiling is skipped and its draws not counted). Draw calls and triangles are the renderer's own count of one frame; materials, textures and their bytes come from the benchmark's own `resources` (moved to `views/gpu-resources.ts`, shared); the update's cost is the median of six batches of twenty calls, as the benchmark times it; its signs are let settle (`signsFading`), then texture uploads and texels are counted over a second's running. The magic room has no world clock to stop, so the benchmark's idle phase is not measured there. The room is not drawn while it measures.

The record (both versions, when, the game's version and build) is kept per viewer in `localStorage` (`pool.visual-cost.<kind>`), every access guarded.

## Where it shows

- **Magic room**: every magic room now has its Penfold signpost (an item without curated looks gets one too). Its panel carries a POLY selector, HIGH · LOW, a normal panel part worked through the one control scheme, and a small green readout of the shown version's cost beside it; the room's bar gives the full line and budget status. `window.magicRoom.poly(i)`, `variant`, `measuring`, `costs`, `versions`.
- **Item audit page**: "Visual cost: HIGH and LOW" near the top, both versions side by side from the last magic-room measurement, with when it was taken and a link to open the room to measure afresh. `window.__visualCost`.
- **CAD views**: a HIGH · LOW selector; each version's four views are drawn by `renderCadViews(adapter, { variant })` and cached apart (the variant is in the key); the shown version's stored cost is given above them.
- **Catalogue** (126, Game objects): sort by name, visual cost (HIGH triangles) or weight (triangles times `usageWeight`, busy rooms double), and a "visual cost measured" filter; measured kinds show their cost line.

## Pure parts (`logic/visual-cost.ts`, tested beside it)

`VisualCost`, `asBenchSample` (a version as a `BenchSample`, so `overBudget` judges it as the benchmark does), `budgetStatus` (within, over, or known by `KNOWN_OVER_BUDGET`), `usageOfRooms`, `weightOf`, `costSummary`, `costReadout`, `CostRecord`, `parseRecord`, `loadRecord`, `saveRecord`, `recordAge`, `sortByCost`.

## Records

`TODO.md` (135 ticked, follow-ups), `CHANGELOG.md` under Unreleased, `doc/agent-tooling.md`, a diary entry.
