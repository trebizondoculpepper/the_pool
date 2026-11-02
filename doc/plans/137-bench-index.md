# 137 plan: the bench index tree

Brief: `doc/prompts/137-bench-index.md`. The owner, 2026-11-02: "get a final review, and if we can just tweak it to working, start building immediately."

## Modules

- `src/toolkit/gallery/logic/page-registry.ts`: `registerPage({ id, name, branch, subject, link, applies?, rows? })`, `pagesFor(branch, subject, id)`, `branchesInUse()` (Rooms, Things and Brands always; Simulation and Tools once a page registers there), `BRANCHES`, `BRANCH_WORDS`.
- `src/toolkit/gallery/logic/bench-pages.ts`: today's pages registered (enter a room, room audit, look audit; item audit, magic room, magic page; brand audit, every brand, unbranded goods; component benchmark, whole look audit, `?dev`). Imported by the index page; a later page's registration module is imported there too.
- `src/toolkit/gallery/logic/bench-index.ts`: the tree model. `IndexNode { id, label, href?, meta?, count?, links?, fields?, children?() }`; `buildIndex(input)` from `ROOMS`, `kindCatalogue`, `lookCatalogue`, `BRANDS` and registered rows; `roomGroup(id)` and `ROOM_GROUPS`; `searchIndex(nodes, words)` (a match keeps its subtree and is opened; ancestors keep only the way to it); `canonicalPath`, `linkedPath(hash, search)`, `nodeAt`, `pathAndAncestors`; `loadState`/`saveState` (`pool.bench-index`, try/catch). Look links from the bench are prefixed `./` so they open the game.
- `src/toolkit/gallery/views/tree-view.ts`: one `role="tree"` component with a roving tabindex, rows built when a branch opens, `render(nodes, open)` and `reveal(path)`.
- `src/toolkit/gallery/logic/sim-bench-pages.ts`: mission 138's simulation graph, node and known architectural-object links registered for the index after 138 landed.
- `src/toolkit/gallery/views/bench-index-page.ts`: `runBenchIndex(root)`, the search box, remembered state, hash links (`hashchange`), then `loadExhibits()` and registered rows, redrawn once. `window.__benchIndex`.
- `src/bench.ts`: no `bench=` runs the index.

## Coordination

138 landed before 137 and freed `catalogue-panel.ts`; the index imports only its exported `loadExhibits`. 137 registers 138's Simulation pages through `registerPage` (branch `simulation`, subject `none`, `rows()`) and imports that registration from `bench-index-page.ts`. Moving `?dev`'s catalogue onto `tree-view.ts` is a follow-up so the tree can land independently of the catalogue's layout.

## Tests

`bench-index.test.ts`: every room, kind and brand present; the acceptance pages reachable; every leaf linked; room groups; search; links (short and full forms); storage, including broken storage; a Simulation branch appearing when a page registers. `sim-bench-pages.test.ts`: the registered Simulation list, node and architectural-object links.
