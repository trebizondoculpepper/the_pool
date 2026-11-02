# 126: The universal catalogue (plan and record)

Brief: [doc/prompts/126-object-index.md](../prompts/126-object-index.md). The owner rewrote the mission on 2026-11-02 and said go; implemented in one stage the same day.

## What was built

- **`src/toolkit/gallery/logic/room-usage.ts`:** `placedRoomItems()`, each equipped room's placed items from its layout (`layoutRoom`, about 4 ms for all thirteen rooms, no scene), cached; `roomKeys()` feeds `countUsage`. The component benchmark's `roomItems()` now reads it, so the benchmark and the catalogue count alike.
- **`src/toolkit/gallery/logic/kind-catalogue.ts`:** `kindCatalogue({ exhibits?, models? })`, every kind: the 104 of `EQUIPMENT_KINDS` (less `plant-room`), `sign`, and one per dev-room exhibit no kind claims. Copies come from the layouts with the register (`INSTALLED_ASSET_IDS`), the bill of parts (`plantInventory`, its kinds and rooms from `describedComponents`: model parts, fixtures, valves, switch-fuses, pumps), and the dev rooms' exhibits. A copy whose tag nests one level under another's is its part. Findings and their words; `isDevRoom`.
- **`src/toolkit/gallery/logic/look-catalogue.ts`:** `lookCatalogue(room?, input)`, each room's entries (ref, title, kind, tag, asset id, model address, parent and parts, aliases, modes, findings, `look`: expected, unverified or none); `matchesSearch`, `lookLink`, `auditLink` (129's page, not yet served).
- **`src/toolkit/gallery/views/catalogue-panel.ts`:** the panel, inserted under the dev panel's header by `src/main.ts`'s `?dev` branch (lazily imported). It draws its rows from data on the first tick, then imports the dev rooms' room modules (`EXHIBITS` in `rooms/plant-room.ts`, now exported, and `MODELS`) to add their exhibits, without building any scene. A row's contents are drawn only when it is opened. Category, filters and search are kept in `localStorage` (wrapped). Tap targets 40 px or more.
- **Console:** `looks [filter]` (the present room's entries) and `catalogue [kind]`.

## How naming is judged

As the brief says: no kind; no tag (an engineering thing outside the dev rooms); tag not under its room's code; generic name; duplicate untagged name in a room. "No maker recorded" is a grey note, not a naming finding. Decorative kinds are exempt.

## Coverage (2026-11-02)

- **Counted:** the thirteen equipped rooms (the four pool plant rooms, wet hall, boiler house, both stores, loading bay, switch room, air plant, control room, engineers' office), from their layouts and the register; and the 45 exhibit dev rooms of `plant-room.ts` (dev10, dev12 to dev15, dev17 to dev58 where they have exhibits, dev61 to dev69), from their `EXHIBITS`: 58 of 134 rooms.
- **Not counted (said in the panel):** dev0's boards and the other dev rooms built by hand, the museum halls, the pool halls, corridors, the bridge, offices other than the engineers', and the concept rooms. They wait for 127.
- **Look links:** "expected" for registered placed things in the equipped rooms and for dev exhibits by their titles' slugs (both marked in their scenes by 125); "unverified" (dotted) for things named only in the bill of parts (valves, model parts, fixtures), which 127 checks.

## First findings

Of 561 kinds, 96 registered kinds are used; 460 are badly named, nearly all dev-room exhibits no kind claims ("no kind"). Among the registered kinds used outside the dev rooms, two: **boiler** (B-501 to B-506, tags not under the boiler house's BH code) and **pump** (P-101A/B, P-201A/B and the rest, the motor starters' tags, not under PL1/PL2). 74 engineering kinds have no maker recorded in data.

## Screenshots (the shared dev server, 2026-11-02)

- [Rooms, the boiler house opened](126/rooms-boiler-house-open.jpg)
- [Game objects](126/game-objects.jpg)
- [A kind opened: boiler, its copies and usage](126/kind-boiler-opened.jpg)
- [Badly named and used outside dev rooms](126/badly-named-filter.jpg)
- [A room's menu: Open, Catalogue, Audit (coming in 129)](126/room-menu.jpg)
