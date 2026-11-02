# 137: The bench page opens on an index of everything to visit

The owner, 2026-11-02, on `bench.html` with no `bench=`: "the bench screen should be a clickable, navigable, expandable list of all the things we can navigate to: Rooms, Things, Brands." Brief only; not started until the owner says. Feedback on missions 126 to 136; `nicole_buruaah` wrote it, at the owner's request not to fix the work but to brief it. Read `CLAUDE.md` and `doc/agent-tooling.md` first.

## What there is now (checked 2026-11-02)

- `bench.html` alone shows one line of five fixed links (`src/bench.ts`, its last branch): the component benchmark, the look audit, one room audit (`plant_pool_03`), one item audit (`weather-station`) and the brands. Every other page has to be reached by typing its URL or through `?dev`.
- `?dev`'s catalogue (`src/toolkit/gallery/views/catalogue-panel.ts`, mission 126) already has the data: Rooms from `lookCatalogue`, Game objects from `kindCatalogue`, Brands from `brand-audit.ts`, with search, counts, look links and audit links.

## What the page should be

`bench.html` with no `bench=` opens on an index with three top-level groups, each expandable, every leaf a link:

- **Rooms:** every room in `ROOMS`, grouped as `?dev` groups them (pool rooms, plant rooms, equipment rooms, development rooms, the rest). Each room expands to its pages (enter it; its room audit; its look audit) and then to its named contents, each with its look link (`front`, and the other modes) and its row in the room audit.
- **Things:** every kind in the kind catalogue (the owner's word for `?dev`'s "Game objects"), grouped by class. Each kind expands to its pages (item audit with its CAD views, magic room or magic page, its HIGH and LOW versions where it has them) and then to its placements by room, each a look link.
- **Brands:** every brand, each expanding to its brand audit and the kinds that carry it (each linking into Things); and the unbranded goods page.
- **Tools,** after the three, small: the component benchmark, the whole look audit, and `?dev`.

How it behaves:

- **Navigable by keyboard:** arrow keys move through the tree, Right and Left open and close, Enter follows a link (a tree with `role="tree"` semantics, or nested `details`/`summary`); the mouse and touch work as well.
- **Search:** one box filters all three groups at once and opens the branches that match (by tag, name, kind, asset id, brand, room), as `?dev`'s search does.
- **Counts on closed branches:** a room's number of contents and flags, a kind's copies and rooms, a brand's kinds, so the tree reads as a map before it is opened.
- **Remembered:** which branches are open and the search, kept for the viewer only (`localStorage`, wrapped).
- **Linkable:** `bench.html#rooms/boiler_house` (or `?open=…`) opens the tree at that branch, so agents and the owner can share a place in it.
- **Fast:** built from data alone, never by building a scene; opening a branch builds only that branch's rows.

## One component, not two

The index and `?dev`'s catalogue show the same data. Build the tree as one component fed by `lookCatalogue`, `kindCatalogue` and the brand audit, and use it in both places (or make `?dev`'s catalogue the tree), so a new kind of page appears in both by adding it once. Each page that exists today adds its links through one registry (a page's name, which group it belongs to, and how to make its link), so the next audit page (or 134's plant report) joins the tree by registering.

## Acceptance

- `bench.html` opens on the tree; every room in `ROOMS`, every kind and every brand is in it.
- From the tree alone, without typing a URL, the owner reaches: the boiler house's room audit; the CM6's look link; the weather station's item audit, CAD views and magic room; Hamwarmy's brand audit; the unbranded goods.
- Keyboard only: open Rooms, find the boiler house, open it, follow its audit link.
- A link to a branch opens the tree there.

## Records

The plan in `doc/plans/137-bench-index.md`; the CHANGELOG under Unreleased (`### Added`, `### Changed`); `TODO.md`: this mission; `doc/agent-tooling.md`: the index and the page registry.
