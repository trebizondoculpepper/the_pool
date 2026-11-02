# 130: The item audit, and its magic room

The owner, 2026-11-02. Brief only; not started until the owner says. Read `CLAUDE.md` first, then 125 (look links), 126 (the universal catalogue, whose Game objects category links each item here) and 129 (the room audit, its counterpart for a room). 125 and 126 are done (`doc/plans/126-object-index.md`), but 126's catalogue is partial: it counts 58 of 134 rooms and excludes, among others, dev0's boards.

## Staged by dependency

1. **Now, after 126:** the page with each kind's existing metadata and its counted copies.
2. **After 127:** complete placements (rooms not counted from data, such as dev0, where the weather console is placed at `src/toolkit/gallery/rooms/controls-room.ts:298`) and named parts.
3. **After 129:** links from placements to room-audit rows.

Until each lands, the page labels its data incomplete.

## What it is for

A close look at one kind of game object (a component kind: a valve, a pump, a mimic board, a weather station console): what it is made of, what states it has, what it looks like in each, and everywhere it has been used. Among its purposes: finding where deprecated or disliked objects are still in use, so they can be replaced, and seeing how an object is used across the building. An object used thousands of times (a valve) gives a long list; that is accepted.

## The item audit page

A development page per game object, linked from its entry in 126's Game objects category, listing:

- **What it is:** its kind, its maker's brand, the real product it is modelled after, its description (derived from the model, as everywhere), and whether it is marked deprecated.
- **Its parts:** each named part, its type, and whether it is properly named by 126's rule; unnamed parts flagged. 125's scene part refs are not 126's catalogue parts: `kindCatalogue()` infers a part from a tag nested under another tag (`kind-catalogue.ts`, about line 271) and does not read `markComponent` part refs, and the weather console's keys are made in its view (`src/toolkit/components/plant/views/weather-station.ts`). The list needs 127's coverage and a shared part inventory.
- **Its main states:** the states it can show (a valve open, shut or travelling; a pump stopped, running or tripped; a lamp lit or dark; a display's pages), with what drives each in the world. These cannot generally be read at run time from TypeScript state types or view inputs: there is no kind-wide state interface, and the weather console's page, units and lamp live in a private `ui` variable inside its builder, with no way for a selector to set them (its logic, `src/toolkit/components/plant/logic/weather-station.ts`, supplies the state model). They come from each kind's factory adapter (below).
- **Its placements:** every room it is placed in and how many copies, each copy with its tag, its asset id, its look link (125) and its row in that room's audit (129); counts in dev rooms and outside them, as 126 counts them. Rooms whose contents are not counted from data (until 127) are named as such.
- **A link to its magic room.**

## The magic room

A grey development room that exists for no other reason: generated for the one item, on demand, from a URL, and not part of the building, its plan or the save. It needs its own route or an explicit synthetic-room exception: `openRoom()` (`src/main.ts:1659`) drops an unknown `room` parameter and returns to the title screen, and `magic` is not a room id; settle the form in the plan. It is excluded from the saved position as well as from world actions: `rememberPlayer` (`src/main.ts:189`) periodically saves the current room and pose.

- **Sized to the item:** the room is built round the item's bounds, with room to walk all the way round it (at least the walker's clearance on every side, more for a large item), and tall enough to stand under or look down on it. A very large item (a boiler, an air handling unit) gets a large room; the smallest still gets a room you can walk round in.
- **Placed to walk round:** the item stands free in the middle, on the floor if it is floor-standing, on a short stub of wall if it is wall-mounted, or hanging if it hangs, facing the door the player enters by; the room's walk collision keeps the player off it.
- **Plain:** grey walls, floor and ceiling, even lighting, the item's name on a title card, a dev room number-free caption saying it is a magic room for that item.
- **The magic control panel:** if the item has states, a signpost beside it carries a small Penfold panel with a knob selector, one position per main state (and a page knob where it has display pages). Turning it sets the item's view to that state, so you can see how it looks. It is a look, not a simulation: the item is not bound to the world, and nothing it does reaches the world or the save. All input goes through the one control scheme, as every knob's does.
- **Back:** a way out to the item audit page and to the catalogue.

The magic room is built by the same view builders the real rooms use, so what it shows is what the game shows. Each renderable kind gets an explicit factory adapter giving its size, its mounting (floor, wall, hanging), sample readings, its state presets and a setter that applies one to the built view; an item whose builder needs a world binding is given the preset's stand-in reading. `KindEntry` (`kind-catalogue.ts`, about line 114) has no product reference or state fields, and many kinds have no reusable builder, so the adapters are new work. The sizing generator can be pure, but walk collision and room construction are verified separately with the real builders (oversized, overhead, pipe-run and tiny items especially), and display presets are checked on the real rendered surface, particularly while 124 is open.

## Which kinds get which (the owner, 2026-11-02)

- **Every kind** in the catalogue gets an item audit page.
- **A magic room** only for a kind with a 3D representation (a view builder that draws it).
- **A magic page** for a kind with no 3D representation (a model block with no drawing of its own, a signal, a controller's logic, a schedule, an abstract kind): a plain text page, linked from its audit like a magic room, that describes what it does: its role in the model, its ports and what they join, its states and what changes them, what reads it and what it drives, and where it shows itself in the game (the displays, lamps and mimics that read it). Written from the model and 131's descriptors, never by hand, so it stays true as the model changes; it is also the shape text adventure mode (128) can reuse for things the player cannot see.

## The panel shows a curated set (the owner, 2026-11-02)

The magic room's panel steps through a curated set of representative looks (a valve open, shut and travelling; a pump stopped, running and tripped), with a separate knob for display pages where the item has them, never every combination of its controls. The magic room is for asking what the thing looks like; working it fully is what the conventional dev rooms are for, and the audit page links to the dev rooms that hold it.

## High and low poly, and visual cost (the owner, 2026-11-02)

- **Two versions:** every drawn kind has its full (high-poly) version, the view builder, and its low-poly version, the far version the museum already draws beyond 30 m (`createFarVersion`, `src/toolkit/components/core/views/far-version.ts`: flat colours merged into a few meshes, screens as dark glass, nothing that moves). Where a kind has a hand-made low-poly version of its own, that is the one shown.
- **Visual cost:** beside each version, its cost, measured as the component benchmark measures it (`BenchSample` in `src/toolkit/gallery/logic/component-bench.ts`): triangles, draw calls, materials, textures and their size on the GPU, and whether it updates every frame (and its update time); with its budget status (within budget, over, or listed in `KNOWN_OVER_BUDGET` with its reason) and, where the catalogue counts it (126), its weight in the game (copies times cost, busy rooms counted double as `usageWeight` does), so the costliest kinds overall stand out. Settle in the plan whether the figures are measured live when the page or room opens or read from the last benchmark run, and show which.
- **In the magic room:** the signpost's panel gains a HIGH · LOW selector that swaps the item between its two versions, and a small readout of the shown version's cost.
- **On the audit page:** the cost of both versions side by side, near the top.

## Shared foundation

The adapters' parts, controls, readings and state presets are the same data 127's named parts, 128's text verbs and 129's "controlled by" need: one shared kind/part/control/view-state descriptor (control ids, the world action each drives, visible readings, state presets). It is to be settled with the owner, not invented separately by this mission.

## Deprecated objects

The audit can mark a kind deprecated (a short list in data, with the reason and its replacement), and 126's Game objects category can filter to deprecated kinds still placed outside dev rooms, which is the list of things to replace.

## Acceptance

- The item audit of the weather station console (CR-CP10's kind) lists its parts, its states and pages, its placements in dev0 and the control room with look links, and opens its magic room, where the panel's knob steps it through its pages.
- A valve's audit lists all its placements across the building, grouped by room.
- A large item (a boiler) and a small one (a gauge) both get a magic room you can walk round.
- The generator (sizing and placement) is pure, in `logic/`, with tests beside it.

## Open questions for the owner

None at present.

## Records

The plan in `doc/plans/130-item-audit.md`; `TODO.md`; `CHANGELOG.md` under Unreleased once built; a diary entry.
