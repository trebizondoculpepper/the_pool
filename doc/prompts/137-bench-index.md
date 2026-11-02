# 137: The bench page opens on an index of everything to visit

The owner, 2026-11-02, on `bench.html` with no `bench=`: "the bench screen should be a clickable, navigable, expandable list of all the things we can navigate to: Rooms, Things, Brands." The owner, later the same day: get a final review and, if it can be tweaked to working, start building. Feedback on missions 126 to 136; `nicole_buruaah` wrote it, at the owner's request not to fix the work but to brief it. Read `CLAUDE.md` and `doc/agent-tooling.md` first.

## What there is now (rechecked 2026-11-02, after missions 125 to 136 landed and while 138 is in progress)

- `bench.html` alone shows one line of five fixed links (`src/bench.ts`, its last branch). `src/bench.ts` dispatches on `bench=`: `components` (094), `lookables` (127, optionally `&room=`), `room-audit&room=` (129), `item-audit&kind=` (130, with 133's CAD views and 135's HIGH/LOW cost on it), `magic-room&kind=` (130, 135's POLY selector), `magic-page&kind=` (130), `brand-audit[&brand=]` and `unbranded` (136). Mission 138 adds `sim-node&node=`, `sim-graph` and `sim-object&room=&ref=`.
- Link makers already exist as pure functions: `lookLink`, `auditLink` (`logic/look-catalogue.ts`); `itemAuditLink`, `magicRoomLink`, `magicPageLink` (`logic/item-audit.ts`); `brandAuditLink`, `UNBRANDED_LINK`, `brandCounts` (`logic/brand-audit.ts`). The look audit's one-room page is `bench.html?bench=lookables&room=<id>`.
- `?dev`'s catalogue (`src/toolkit/gallery/views/catalogue-panel.ts`, missions 126, 130, 135, 136) has tabs Rooms, Game objects and Brands, with search, filters and look links; 138 is adding a fourth tab, Simulation. It does not group rooms: it lists `ROOMS` in order. Its data: `lookCatalogue`, `kindCatalogue` (`loadExhibits()` in the same file adds the dev rooms' exhibits lazily), `BRANDS`.

## What the page should be

`bench.html` with no `bench=` opens on an index with top-level branches, each expandable, every leaf a link:

- **Rooms:** every room in `ROOMS`, in groups decided by a pure `roomGroup(id)` in the tree's logic (pool halls, plant rooms, control rooms, equipment dev rooms dev61 to dev69, development rooms, museum halls, the rest; `?dev` has no grouping to copy). Each room expands to its pages (enter it, its room audit, its look audit) and then to its named contents from `lookCatalogue`, each with its look link (front, and left, right, above) and its row in the room audit (`#row-<ref>`).
- **Things:** every kind in the kind catalogue (the owner's word for `?dev`'s "Game objects"), grouped by class (`CLASS_ORDER`, `CLASS_WORDS`). Each kind expands to its pages (item audit, which carries 133's CAD views and 135's HIGH/LOW visual cost; magic room, whose POLY selector shows HIGH and LOW; magic page) and then to its placements by room, each a look link (prefixed `./` so it opens the game, not `bench.html`). Dev-room exhibits are added when `loadExhibits()` resolves; until then the page's status line, above the tree, says they are loading (with or without a search).
- **Brands:** every brand in `BRANDS`, each expanding to its brand audit and the kinds that carry it (each linking to that kind's item audit and to its place under Things); the brand list page; and the unbranded goods page.
- **Simulation** (mission 138, the owner's choice): now that 138 has landed, 137 registers its graph list (`sim-graph`), node pages (`sim-node`) and known architectural-object pages (`sim-object`) through the page registry. The graph data and pages remain 138's; 137 only links to them.
- **Tools,** after the rest, small: the component benchmark, the whole look audit, and `?dev`.

How it behaves:

- **Navigable by keyboard:** a tree with `role="tree"`, `treeitem` and `group` semantics, one roving tabindex: Up and Down move, Right opens (or moves to the first child) and steps through a leaf's extra links, Left closes, returns to the parent or steps back to its row, Home and End, Enter follows the focused link; mouse and touch work as well.
- **Search:** one box filters every branch at once and opens the branches that match (tag, name, ref, kind, asset id, brand, room), by `searchWords` and `matchesSearch` as `?dev` does.
- **Counts on closed branches:** a room's named contents and flagged ones, a kind's copies and rooms, a brand's kinds and copies, a group's members.
- **Remembered:** open branches and the search, for the viewer only (`localStorage` key `pool.bench-index`, every access in try/catch; the page works without it).
- **Linkable:** `bench.html#rooms/plant/boiler_house` or `bench.html?open=rooms/plant/boiler_house` (a room may be named without its group: `#rooms/boiler_house`) opens the tree at that branch (its ancestors opened, it focused and scrolled to); a link overrides the remembered state for that visit. Path segments are node ids, URI-encoded.
- **Fast:** built from data alone, never by building a scene; opening a branch builds only that branch's rows.

## One component, not two

Build the tree as one view component (`views/tree-view.ts`) over a pure tree model (`logic/bench-index.ts`: nodes with id, label, href, count, search fields and lazy children; filtering; counts; open-state encoding for links and storage), fed by a **page registry** (`logic/page-registry.ts`): each entry has a name, the branch it belongs to (`rooms`, `things`, `brands`, `simulation`, `tools`), and how to make its link from a room, a kind, a brand or nothing. Today's pages register there (`logic/bench-pages.ts`, imported by the index page); a later mission's registration module must be imported by the index page too (the registry discovers nothing by itself); 138 and the next audit page (or 134's plant report) join by registering. Moving `?dev`'s catalogue onto the shared tree is a later step, done only once 138 frees `catalogue-panel.ts` (it holds it now); until then the catalogue keeps its own tabs and the registry is the bench index's alone.

## Acceptance

- `bench.html` opens on the tree; every room in `ROOMS`, every kind and every brand is in it.
- From the tree alone, without typing a URL, the owner reaches: the boiler house's room audit; the CM6's look link; the weather station's item audit, CAD views and magic room; Hamwarmy's brand audit; the unbranded goods.
- Keyboard only: open Rooms, find the boiler house, open it, follow its audit link.
- Pure parts (tree model, registry, search, counts, open-state encoding) in `logic/` with tests beside them.
- A link to a branch opens the tree there.

## Records

The plan in `doc/plans/137-bench-index.md`; the CHANGELOG under Unreleased (`### Added`, `### Changed`); `TODO.md`: this mission; `doc/agent-tooling.md`: the index (now the agents' front door) and the page registry; a diary entry.
