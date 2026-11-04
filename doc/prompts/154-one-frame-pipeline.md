# 154: One frame pipeline for every room

The owner, 2026-11-04. Brief only; not started until the owner says. The first of four missions split from the constant-frame-rate work (154 pipeline, 155 fixed simulation step, 156 graphics panel, 157 frame-rate governor). Read `CLAUDE.md` and the research `doc/research/constant-frame-rate.md`.

## Why

All rooms in the game should behave the same way (the owner): world stepping and rendering here; interaction is mission 158, which comes first. Today each room owns its loop through `renderer.setAnimationLoop`, wrapped in `createRenderer` (`src/toolkit/components/core/parts/render-style.ts`, about line 435), and handles its own frame: its delta, its clicks, its world step, its drawing. That makes rooms subtly different and gives the frame-rate governor (157) nowhere single to act.

## One frame pipeline

One shared pipeline every room's frame runs through, in a fixed order:

1. measure the frame (timestamps; GPU timer queries where the browser offers them), exposing frame time to later stages;
2. input and object click actions, through the one control scheme;
3. world steps (the fixed step is 155's; this mission gives it its stage);
4. views update from the world (mission 094's redraw-on-change rule stands);
5. an adjust stage, empty here, where 157's governor will act;
6. render, including doorway underlays, each with its own scale and cadence settable from stage 5.

A room supplies its content and its per-frame view updates; it no longer owns its loop, its click handling or its rendering. Migrate every room; a room that cannot yet be migrated is listed with its reason.

## Acceptance

- Every room runs through the pipeline, or is listed as an exception with its reason; world stepping and rendering behave the same in all of them.
- The frame measurement (smoothed frame time, 95th percentile, dropped frames) is pure logic in `logic/`, tested, and readable by later stages.
- Nothing else visibly changes for the player; the full test suite passes.

## Coordination

Builds on 158's room factory (input and clicks are its stage 2), so starts after 158. Touches every room's frame loop and `render-style.ts`: claim on the mailbox and migrate rooms in batches others can see. 155 can start now; 157 needs stages 1, 5 and 6.

## Records

A plan in `doc/plans/154-one-frame-pipeline.md`; `TODO.md`; `CHANGELOG.md` under Unreleased once built; a diary entry.
