# 154: One kind of room: one frame pipeline and the same capabilities everywhere

The owner, 2026-11-04. Brief only; not started until the owner says. The first of four missions split from the constant-frame-rate work (154 pipeline, 155 fixed simulation step, 156 graphics panel, 157 frame-rate governor). Read `CLAUDE.md` and the research `doc/research/constant-frame-rate.md`.

## Why

All rooms in the game should behave the same way (the owner): object click actions, world stepping, rendering. Today each room owns its loop through `renderer.setAnimationLoop`, wrapped in `createRenderer` (`src/toolkit/components/core/parts/render-style.ts`, about line 435), and handles its own frame: its delta, its clicks, its world step, its drawing. That makes rooms subtly different and gives the frame-rate governor (157) nowhere single to act.

## One kind of room (the owner, 2026-11-04)

There is one kind of room. Every room, including the development rooms and the magic rooms (130), has the same capabilities unless the owner explicitly says otherwise, and any such exception is written in the room's definition with the owner's ruling.

A survey (2026-11-04, read-only) found why they differ today: `createFirstPerson` (`src/toolkit/controls/input/first-person.ts`) shares keys and motion, but each of 41 room builders supplies its own `use` callback with its own raycast and list. Eight builders ignore clicks (`use: () => {}`: shared-plant-layout, plant-fit, ceiling-lab, white-corridor, dry-stair, pipes-n-dreams, arched-rooms, donut-pool); the pool halls (`pool-hall-room.ts`) handle only a fixed list; the hover cue (`markUsable`/`usableOf`, `use-marking.ts`) is wired apart from the click, so a part can show a cue and do nothing. Seating works only in `shell-room` builds, inspect naming in five builders, pick-up (`objects`) in about half.

Every room therefore gets, from one room factory that `main.ts` calls when opening any room:

- **one click handler:** a click reaches whatever the cue finds, through the components' own registration (`markUsable`, `parts.uses`), so anything that shows a cue works when clicked; the per-room `use` lists go;
- **mouse-over context:** hovering any object shows what it is (its name, and its tag where it has one), from the same registration and the inspect rule (no peeking), in every room;
- **seating, pick-up, ladders and raised floors, the torch,** wherever the room holds the things they act on;
- **the shared frame pipeline** below.

The 41 near-identical `createFirstPerson({...})` blocks become one call.

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

- Every room runs through the pipeline, or is listed as an exception with its reason; clicks, world stepping and rendering behave the same in all of them.
- The frame measurement (smoothed frame time, 95th percentile, dropped frames) is pure logic in `logic/`, tested, and readable by later stages.
- Every room, dev and magic rooms included, clicks and shows mouse-over context the same way; a test walks the room registry and checks each room is built by the factory with no capability missing that is not an owner-ruled exception.
- Nothing else visibly changes for the player; the full test suite passes.

## Coordination

Touches every room's frame loop and `render-style.ts`: claim on the mailbox and migrate rooms in batches others can see. 155 can start now; 157 needs stages 1, 5 and 6.

## Records

A plan in `doc/plans/154-one-frame-pipeline.md`; `TODO.md`; `CHANGELOG.md` under Unreleased once built; a diary entry.
