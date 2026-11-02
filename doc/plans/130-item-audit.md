# Plan 130: the item audit, its magic room and magic page

Brief: `doc/prompts/130-item-audit.md` (the owner, 2026-11-02, with the rulings: every kind gets an item audit; a magic room only for a kind with a 3D representation; a magic page for one without; the panel shows a curated set of looks and a page knob, never every combination; full working belongs to the dev rooms, which the audit links to; deprecated kinds listed in data). The owner said go on 2026-11-02, scoped to the machinery only: proved on a handful of kinds, nothing run across every kind or room, no findings or counts recorded.

## Contents

- [Routes](#routes)
- [The item audit page](#the-item-audit-page)
- [The magic room](#the-magic-room)
- [The magic page](#the-magic-page)
- [Adapters](#adapters)
- [Deprecated kinds](#deprecated-kinds)
- [Pure parts and tests](#pure-parts-and-tests)
- [Hooks for 133 and 135](#hooks-for-133-and-135)
- [Proof kinds](#proof-kinds)
- [Not done here](#not-done-here)

## Routes

All three are development pages on `bench.html`, beside 127's look audit and 129's room audit, so none of them is a room of the building:

- `bench.html?bench=item-audit&kind=<kind>`: the item audit page.
- `bench.html?bench=magic-room&kind=<kind>`: the magic room, a full-window scene of its own.
- `bench.html?bench=magic-page&kind=<kind>`: the magic page.

Settling the brief's open form: the magic room is its own route, not a synthetic room id in `main.ts`. `openRoom()` never sees it, so it is not in `ROOMS`, the facility plan, the dev panel's room list or the look audit's room set; `rememberPlayer` (which runs only in `main.ts`) never saves a pose in it; and nothing on the page opens a world store, so it cannot touch the save. Presets that need a world (131's `applyPreset`) are applied to a scratch `newWorld()`, never the player's.

## The item audit page

From data (126's `kindCatalogue`, with the dev rooms' exhibits loaded as the catalogue panel loads them), for one kind:

- **What it is:** kind key and word, class, maker, the real product (the kind's model exhibit's reference where it has one), its purpose from the kinds' register, whether it is deprecated (with reason and replacement).
- **Its representation:** a link to its magic room (a kind with an adapter), else to its magic page.
- **Its parts:** the catalogue's parts (copies of other kinds nesting under a copy's tag), and the adapter's named parts once built (the magic room lists them); unnamed parts are 127's scan's to find.
- **Its states:** the adapter's curated looks and pages; 131's descriptors' presets and controls for the kind where described. Labelled incomplete where neither exists.
- **Its placements:** every counted copy grouped by room (counts in and outside dev rooms, as 126 counts), each copy with its tag, asset id, look link (125) and its row in that room's audit (129, `#row-<ref>`). Rooms not counted from data are named as such, collapsed, each with a button that builds that one room through 127's adapter in a frame (`auditInFrame`) and adds the copies its scan finds (matched by kind, or by the kind's word or model title). Nothing is scanned until asked.
- **Its dev rooms:** the adapter's list of dev rooms that hold the item working, and the counted dev rooms; linked, since the dev rooms are where it is worked fully.
- **Back:** to the catalogue (`./?dev`).

## The magic room

Built by `views/magic-room.ts` from the kind's adapter, with the same view builders the rooms use:

- **Sized and placed** by the pure generator `logic/magic-room-layout.ts` (`magicRoomLayout`): the item in the middle, facing the entrance (south); at least the walker's clearance on every side (more for a large item: a quarter of its larger extent, up to 3 m); tall enough to stand under or look down on it; never smaller than a room you can walk round. Floor items stand on the floor; wall items on a stub of wall (a free-standing plinth wall, 0.2 m thick) so you can walk behind; hanging items from the ceiling. Its solids: the item's footprint (or its stub's) and the signpost's.
- **Plain:** grey walls, floor and ceiling, even light; the item's name on a title card on the north wall, captioned "Magic room: <kind>, a development room for this item alone (mission 130)", no room number.
- **The magic control panel:** where the adapter has looks or pages, a signpost to the item's right carries a small Penfold panel (its maker's mark in the top right) with a LOOK selector, one position per curated look (at most four), and a PAGE selector where the item has display pages. They are the game's own `selector` parts, worked through the one control scheme (`createFirstPerson`'s use); each turn calls the adapter's setter. Nothing is bound to the world.
- **Back:** a bar over the canvas with links to the item audit page and the catalogue.
- `window.magicRoom` (`{ kind, layout, look(i), page(i), place(x, z, yaw) }`) for pictures and tests.

## The magic page

`logic/magic-page.ts` (`magicPage`) writes, from the model and 131's descriptors only: its role (the kinds' register's purpose and class), each copy's description from the model (`plantInventory`), what it is part of (its parent tag), its connections in its room's enhanced network where it is a node there (129's `connectionsOf`), what works it (`controlledBy` over 131's descriptors), its states (descriptor presets and controls) and what shows it (readings of described objects in its room naming it). Each section says plainly when the model does not say. It is the shape mission 128's text mode can reuse.

## Adapters

`views/magic-adapters.ts`: `adapterFor(kind)` gives a `MagicAdapter`: `title`, `size` (`w, h, d`, metres) and `mount` (`floor`, `wall`, `hanging`), `build(kit)` returning the object, its parts, its update and a `setLook(id)` / `setPage(id)`, `looks` and `pages` (curated), and `devRooms`. Two sources:

- **Explicit:** the weather station console (`createWeatherStation` with a stand-in reading; looks: sensors reading, backlight lit, no data; pages: main, second). Its builder gains `show(ui)`, a setter of its keys' state, so the panel can set what its own keys would.
- **From its model:** any kind with a model exhibit (`MODELS` in `views/room-equipment.ts`): its size, mount and builder; no looks yet (the panel is left off and the page says the kind's looks are not yet curated).

A kind with neither is a magic-page kind.

## Deprecated kinds

`DEPRECATED_KINDS` in `logic/item-audit.ts`: kind, reason, replacement. Empty until the owner names one; the audit shows the mark and the catalogue's Game objects tab gains a "deprecated, still outside dev rooms" filter reading it.

## Pure parts and tests

- `logic/magic-room-layout.ts`: room sizing and placement (tests: small, large, wall, hanging, clearance, panel off the item, solids).
- `logic/item-audit.ts`: links, placement grouping, uncounted rooms, scan matching, preset selection (`lookAt`, clamped to the selector's four positions), deprecated list (tests beside).
- `logic/magic-page.ts`: the magic page's text (tests on the pump kind and on a kind the model does not know).

## Hooks for 133 and 135

`views/item-audit-page.ts` exports `ITEM_AUDIT_SECTIONS`, a list of extra section builders (`(ctx) => HTMLElement | null`) drawn after the built-in sections: 133's CAD views and 135's HIGH/LOW poly and visual cost register there. `MagicAdapter.build` returns the built object, which they can measure. Nothing of either is built here.

## Proof kinds

- `weather-station`: its page, its magic room and the panel's LOOK and PAGE knobs; its dev0 placement found by scanning dev0 on the page.
- `butterfly-valve`: its full placement list, grouped by room.
- `boiler-cascade`: a large magic room.
- `earthing-terminal`: a small wall item's magic room.
- `pump`: the magic page (a model block drawn only as part of its pump set).

## Not done here

Adapters with curated looks for every kind; 127's shared part inventory (parts in the page are the catalogue's, and the built item's in the room); display presets checked on the rendered surface for every display kind; the CAD and cost sections (133, 135).
