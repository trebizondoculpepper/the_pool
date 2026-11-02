# 126: The object index: the dev panel's rooms open into what is in them

The owner, 2026-11-02: the dev panel's room list "is just a list of links to rooms … what if that list now becomes a collapsible list of lookable things? … rather than just clicking on dev 3, you expand the list, and within that you see … things you can look at, and so it effectively jumps the player directly to the thing of interest." The second of three missions: 125 makes look links (`?room=…&look=…&mode=…`); this one lists, room by room, the objects a look link can reach; 127 makes everything lookable and audits it. Briefs only until the owner says go. Read `CLAUDE.md` and mission 125's brief and plan first. Reviewed by Codex 2026-11-02; its corrections are folded in.

## Depends on

- **Mission 125's ref rules and resolution** (what a ref is, how it is matched, uniqueness). 126 starts once they are merged.
- **The catalogue interface** (below) is this mission's first deliverable and is shared with 127: once it is merged, the panel (the rest of 126) and 127's coverage work go on in parallel.

## What there is now (checked 2026-11-02)

- **The dev panel** (`?dev`) is static HTML in `index.html`'s `#room-index`, hidden until `src/main.ts` reveals it (about line 1537), with sections for pool rooms, plant rooms, equipment rooms and development rooms: 64 links in all. It is not every room: `dev69` (ozone) is in `EQUIPMENT_ROOMS` but not on the panel, and `ROOMS` in `src/toolkit/gallery/logic/dev-room-links.ts` holds more rooms reachable only by URL.
- **The bill of parts** (`?manual`, `src/toolkit/manual/plant-manual.ts`) renders `plantInventory` (`src/game/plant/equipment-catalogue.ts`), which mixes model parts, placed equipment, fixtures, controls and room records. Not every row has an asset id or an object in a scene.
- **The register:** `INSTALLED_ASSET_IDS` (`src/game/plant/installed-asset-ids.ts`), keyed `room|item.key|item.label` (key arguments included, `equipment-catalogue.ts` about line 86), gives placed equipment its asset id and tag; `room-equipment.ts` marks each placed object with that tag.
- **Dev rooms' exhibits:** each room module's `EXHIBITS` (for example `rooms/plant/boiler.ts` about line 265; `rooms/plant/exhibit.ts`) holds titles together with the Three.js functions that build them, so they cannot be listed without loading the room.

## The catalogue (first deliverable, shared with 127)

The panel must open quickly and must not build any room's scene, so the list comes from data:

- **`lookCatalogue(room?)`**, pure and tested (`src/toolkit/gallery/logic/look-catalogue.ts`): entries of room, ref (125's form), title, kind, aliases for search, its parts, and the modes that suit it.
- **Placed equipment:** from the register, joined to the rooms' equipment specs the scene is built from (the same `room|item.key|item.label` key `room-equipment.ts` marks with), so an entry exists only where the scene marks an object. Model-only and manual-only records stay out until 127 makes them lookable.
- **Dev rooms' own objects:** pull each dev room's metadata (title, slug, kind, parts) for everything it places itself into a small pure module beside the room (`logic/`), which the room module imports alongside its builders: its `EXHIBITS`, and objects placed directly, outside that structure (dev0's weather station console, `rooms/controls-room.ts` about line 298, and its other boards). The room marks each object with that metadata, so the list and the scene cannot drift. Rooms placed by hand are listed room by room in the plan as they are moved over; until a room's are, it shows only its placed equipment.
- **Aliases:** an entry's search words beyond its tag, title and asset id: its product name from the brands and models (`CM6`, `WeatherWatch Pro`), its kind (`mimic`, `boiler`). So "cm6" finds BH-CP3.
- **Kept honest:** a browser check builds each room and resolves every catalogue entry through 125 (it must find exactly one object); 127's audit checks the other way.

## What the panel shows

- **The rooms:** the panel lists every room in `ROOMS`, grouped as now; rooms missing from today's static HTML (`dev69` and the URL-only rooms) are added, in a group of their own where they fit no section. Generate the list from `ROOMS` and the catalogue in `src/main.ts`'s `?dev` branch, replacing the static links (the panel already needs script to be shown).
- **Each room opens:** every room's row is a `details`/`summary`, so it opens by keyboard; its own link stays as it is. Opened, it lists the room's catalogue entries, one a line: tag, title and asset id, each line a look link (`front`), with small `left`, `right`, `above` and `detail` links where they suit, and the parts `detail` reaches under their object. A room with no entries says so.
- **Counts:** a closed row says how many entries it holds ("12"); once 127's report exists, also how many scene objects it could not name ("3 unlabelled"), read from the report's committed file (127 defines it).
- **Search:** one box at the top filters every room's entries by tag, title, asset id, alias or room ("BH-", "CM6", "asset-1308", "weather"), opening the rooms that match.
- **Remembered:** which rooms are open, and the search, kept for the viewer only (`localStorage`, every read and write wrapped so a private window still works).
- **Reused:** the list is one component fed by one catalogue. The console's `looks` lists the present room's entries; the bill of parts gives a look link to each row that has a catalogue entry, and only those.

## Acceptance

- **The catalogue:** every entry resolves to exactly one object when its room is built (the browser check); refs are unique within a room; slugs are stable across builds; BH-CP3 is found by "cm6", "BH-CP3" and "asset-1308".
- **The panel:** in the browser, every room in `ROOMS` is listed and opens; its links land on their objects (spot-check one per section with screenshots in the plan); search and remembered state work; a private window works.
- **The bill of parts:** its look links land on their objects.

## Not in this mission

No change to how a look link chooses its view (125); no marking of objects not already marked (127). No world state.

## Records

The plan in `doc/plans/126-object-index.md`; the CHANGELOG under Unreleased (`### Added`, `### Changed`); `TODO.md`: this mission and its follow-ups.
