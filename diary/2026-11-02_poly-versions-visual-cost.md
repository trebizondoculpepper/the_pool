# Development Diary Entry - 2026-11-02

## Context

- **Date**: 2026-11-02 13:55 UTC
- **Branch**: main
- **Contributors**: Claude Code + the owner

## Problem Statement

Mission 135: give every drawn kind a HIGH (view builder) and LOW (far version) form, switchable in the magic room and on the CAD views, and show each version's visual cost as the component benchmark measures it, measured live when the magic room opens (the owner's ruling). Machinery only: the weather station console, the boiler cascade and the earthing terminal.

## Our Approach

Pure parts (budget status through the benchmark's own `overBudget`, weight through `usageWeight`, the stored record and its age, sorting) in `logic/visual-cost.ts`; a measuring routine in `views/visual-cost.ts` that borrows the benchmark's framing, its `resources` (moved to a shared module) and its update timing; a POLY selector and green readout on the magic room's Penfold panel, now on every magic room; a cost table and a HIGH · LOW selector on the item audit page; sort and filter in the catalogue from stored figures only.

## Outcomes

- Two measurement traps found in the browser: the first reading counted no draws because the measuring holder's world matrix was stale when the camera was framed (the box came out in local units), and shader programs still compiling are skipped by the renderer; fixed by updating the scene's matrices and `compileAsync` first. Then signs fading after a new framing showed as uploads (the LOW version looked over budget); the measurement now waits for `signsFading`, as the benchmark does, and the room stops drawing while it measures.
- The KNOWN_OVER_BUDGET entry for the boiler is `boiler-cascade:1` (a room item key with an argument); the magic room's ids are the bare kind, so a known overrun of a room item is not matched yet.

## Next Steps

See TODO.md's 135 follow-ups.
