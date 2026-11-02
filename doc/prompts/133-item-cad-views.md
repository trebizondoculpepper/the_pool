# 133: CAD views on the item audit page

The owner, 2026-11-02. Brief only; not started until the owner says, and after 130 (the item audit and its magic room), whose per-kind factory adapters it reuses. Read `CLAUDE.md`, then 125, 126, 127, 130 and 131.

## What it is

Near the top of each item audit page (130), for every kind with a 3D representation, four pre-rendered images of the object, laid out as traditional CAD software shows a part, so you can see what it looks like without opening its magic room:

1. **Top:** orthographic, looking straight down.
2. **Front:** orthographic, square on to its front (its own +z, as 125's `front` mode takes it).
3. **Side:** orthographic, square on to its right-hand side.
4. **Three-quarter:** a perspective view from above the object's centre line and off one front corner, so it is seen in the round.

The object alone: no room, no furnishings, no pipes or neighbours, on a plain, even background with even lighting, each view labelled (TOP, FRONT, SIDE, PERSPECTIVE) and, for the three orthographic views, a scale bar or its overall dimensions in millimetres, as a drawing sheet would carry them.

## How it is made

- **The same builder the game uses:** each image is the kind's real view builder (130's factory adapter), so what it shows is what the game shows, at a representative state (130's default preset, from 131's descriptors).
- **Rendered off-screen:** one small renderer, an orthographic camera fitted to the object's bounds for the three flat views and a perspective one for the fourth, then disposed. Nothing runs per frame and nothing is bound to the world or the save.
- **Rendered in the browser, then cached** (the owner, 2026-11-02): the first time an item's audit page opens, its four views are rendered there and kept in the browser's cache (IndexedDB, wrapped against blocked or full storage), so later visits show them at once; nothing is built or committed. Each cached image is keyed by the kind and a fingerprint of what drew it (the game's version and build, and the builder's identity), so a changed builder or a new build renders afresh and a stale image is never shown. While rendering, the page shows the views' frames with a short note.
- **Kinds without a 3D representation** have no CAD views; their audit page shows their magic page (130) instead.

## High and low poly (the owner, 2026-11-02)

The four views have a HIGH · LOW selector, showing the object's full or low-poly version (130's two versions), each cached separately; each version's views carry its visual cost (130's figures: triangles, draw calls, texture size), so the two can be compared at a glance.

## Acceptance

- The weather station console, a valve, a pump, a boiler and a mimic board each show four correct views on their audit pages, the object centred and filling its frame, its front where 125 says its front is.
- A large item and a small one are both framed well, and the orthographic views are to scale with one another.
- A stale image is detected (by the builder's source changing) and remade.
- Pure parts (view fitting, scale and dimension maths, staleness) live in `logic/` with tests beside them.

## Open questions for the owner

None at present.

## Records

The plan in `doc/plans/133-item-cad-views.md`; `TODO.md`; `CHANGELOG.md` under Unreleased once built; a diary entry.
