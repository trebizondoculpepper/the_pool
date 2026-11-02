# Agent tooling: seeing, finding and driving the game

A practical guide for agents (and humans) designing or debugging The Pool. The owner (2026-11-02): the development tools added this week exist so that camera placement and object investigation are taken away or greatly simplified. Reach for them before hand-hunting coordinates, yaw angles or scene objects. Everything below was checked against the code on 2026-11-02; when you add or change one of these tools, update this guide in the same commit (AGENTS.md says so).

## Contents

- [I want to see X](#i-want-to-see-x): look links
- [I want to know what is in room Y](#i-want-to-know-what-is-in-room-y): the `?dev` catalogue
- [Where is kind K used?](#where-is-kind-k-used): the kinds' catalogue
- [What does control Z do?](#what-does-control-z-do): control descriptors
- [Drive the world headlessly](#drive-the-world-headlessly): `poolWorld`, the console, `exhibitRoom`
- [Reproduce a player's bug](#reproduce-a-players-bug): state files and the event log
- [Pose links (the fallback)](#pose-links-the-fallback)
- [Audits (in progress)](#audits-in-progress): 127, 129, 130, 133 (done)
- [Benchmarks, dev servers and pictures](#benchmarks-dev-servers-and-pictures)
- [Rules of thumb for agents](#rules-of-thumb-for-agents)

## I want to see X

Use a **look link** (mission 125; record in `doc/plans/125-look-links.md`). Name the thing; the game works out the camera.

```text
?room=<room>&look=<ref>[&mode=<mode>][&fit=<fraction>][&shot=1]
```

- **ref** (`src/toolkit/gallery/logic/look-ref.ts`), case ignored, tried in this order: a register ref (an asset id such as `asset-1307`, or a registered tag such as `BH-CP3`); a model binding (`node:…`, `fitting:…`, `link:…`); a tag not in the register; a name or its slug (`weather-station-console`); a part's own key or `part:<label>`. A part follows a slash: `BH-CP3/cm6-home-key`. `#n` picks the nth of a repeated name in scene order (`valve#2`).
- **room** may be left out for a registered tag or asset id: `?look=CR-CP10` finds the control room and writes it into the address.
- **mode**: `front` (default), `left`, `right`, `room` (from the room's middle), `detail`, `above`. An unknown mode falls back to `front` with a warning.
- **fit**: the fraction of the view the thing fills, default `0.8`, at most 1.
- **shot=1** hides the HUD, the room caption, the crosshair, the movement buttons and the success notice, for clean pictures.

Examples on a dev server: `http://192.168.86.87:5175/?room=boiler_house&look=BH-CP3`, `?room=boiler_house&look=B-501&mode=above`, `?room=boiler_house&look=BH-CP3/cm6-home-key&mode=detail`, `?room=dev39&look=heat-energy-mimic&shot=1`.

**Refusals** are specific and are themselves useful: unknown (`no 'BH-CP9' in boiler_house; nearest: BH-CP1, BH-CP2, BH-CP3`), ambiguous (`'Valve' matches 4 objects: …`), in the register but not marked in the scene, in another room (`… is in control_room, not boiler_house`), a part not found (lists the object's parts), a room with no marked objects (`no lookable objects in dev7 yet`), and a ref without `room` that is not in the register. Rooms that answer look links: the shell rooms (boiler house, control room and the rest), the pool plant rooms, dev0, and every exhibit room of `plant-room.ts`; others answer "no lookable objects".

**Machine-readable result**: `window.__poolLook`:

```text
{ ref, room, found, mode, pose: {x, y, z, yaw, pitch, zoom, noclip}, seen, box,
  candidates, warnings, reason, link, ready, done }
```

Wait for `done` (finished, found or not); take a picture only once `ready` (placed and two frames drawn). `seen` is how many of nine rays reach the thing (8 or 9 is good); `reason` holds a refusal; `link` is the equivalent pose link; `warnings` say when the camera had to compromise or go noclip.

**From the in-game console** (open with the backquote key): `look <ref> [front|left|right|room|detail|above]` in the present room; `cam` prints the link to the present view.

**From a script**: `node scripts/look.ts <room|-> <ref> [mode,mode…]` drives headless Chrome against a running dev server (it never starts one; `LOOK_URL` overrides the default `http://127.0.0.1:5175`), saves `doc/marketing/tmp/look/<room>_<ref>_<mode>.png`, prints each result and its pose link, and exits non-zero on a refusal or a 60 s timeout. Use `-` for the room to let the register find it. The `npm run look` alias is not yet in the committed `package.json`; until it is, call the script with `node`.

## I want to know what is in room Y

Use the **universal catalogue** (mission 126; `doc/plans/126-object-index.md`).

- **In the browser**: open any page with `?dev`. The catalogue panel sits under the dev panel's header with two tabs, **Rooms** (each room's named things: ref, title, kind, tag, asset id, model address, parts, look-link modes and naming findings) and **Game objects** (every kind with its copies and usage). Filters: used, **used outside dev rooms**, and badly named; a search box matches every word against ref, tag, title, asset id, room and aliases (kind, kind word, maker). Each room has a menu: Open, Catalogue, Audit (129's room audit). Each row offers its look links.
- **In the console**: `looks [filter]` lists the present room's entries (look ref, name, kind); `room [room]` lists a room's valves, switches and motors; `rooms [filter]` every room by id and name; `status <name>` everything known of one object (`status PL3-BT1`).
- **Without a browser** (preferred for agents: fast, deterministic, no scene): import the pure modules in a test or script.
  - `src/toolkit/gallery/logic/look-catalogue.ts`: `lookCatalogue(room?, input?)` returns `LookEntry[]` (`room, ref, title, kind, kindWord, tag?, assetId?, model?, parent?, aliases, parts, modes, look, findings`); `look` is `expected`, `unverified` (named only in the bill of parts) or `none`. Also `lookLink(room, ref, mode)`, `matchesSearch`, `searchWords`, `entryFields`.
  - `src/toolkit/gallery/logic/room-usage.ts`: `placedRoomItems()`, each equipped room's placed items from its layout (about 4 ms for all thirteen equipped rooms, cached); `roomKeys()`.

Coverage (2026-11-02): the thirteen equipped rooms and the 45 exhibit dev rooms. dev0's boards, the other hand-built dev rooms, museum halls, pool halls, corridors, the bridge and concept rooms are not yet counted; they wait for 127.

## Where is kind K used?

- **Console**: `catalogue` lists every kind with its copies, copies outside dev rooms and worst findings; `catalogue <kind>` gives one kind in full (`N in all, M outside dev rooms: <rooms>`).
- **Code**: `kindCatalogue({ exhibits?, models? })` in `src/toolkit/gallery/logic/kind-catalogue.ts` returns `KindEntry[]`, each with `copies` (room, ref, tag, asset id, model, parent, findings, look) and `usage` (`count`, `outsideDev`, `rooms`). `isDevRoom(room)`, `isBadlyNamed(findings)`, `NAMING_FINDINGS` and `FINDING_WORDS` explain the findings. Without `exhibits` it counts the equipped rooms and the register; the dev rooms' exhibits need the room modules (`EXHIBITS` in `rooms/plant-room.ts`), which the panel imports lazily.
- **Browser**: the `?dev` catalogue's Game objects tab, a kind opened.

## What does control Z do?

Use the **control descriptors** (mission 131; `src/game/descriptors/`, brief `doc/prompts/131-control-descriptors.md`). Pure, no scene. Described so far: `plant_pool_03` (the Jacuzzi plant room) and `control_room` (its mimics), listed in `DESCRIBED_ROOMS` in `registry.ts`.

- `objectDescriptors(room?)`: every `ObjectDescriptor` (`ref, room, kind, class, name, controls, readings, view, presets`).
- `descriptorFor(ref, room?)`: one object by its ref, case ignored.
- `controlFor('PL3-CAB1/power', room?)`: one `Control` by id (object ref, slash, key). A `Control` has `key, ref, label, form` (`selector`, `push-button`, `illuminated-button`, `valve-handle`, `isolator`, `page-button`), `inputs` (`['on','off']`, `['press']`…), `local` (only on its plant room's own panel), `action(world, input)` (the `WorldAction` it would send, or null), `position(world)`, `targets` (the model refs it works) and, for page buttons, `view`.
- `soleControl(ref)` for a thing with exactly one control (a valve handle, an isolator); `kindControls(kind)` for a kind's controls.
- `descriptor.ts`: `applyPreset(world, preset)` puts a scratch world into a representative state (its actions, then `seconds` stepped a second at a time) and returns a new world; `readAll(descriptor, world, view?)` reads every lamp, display and gauge; `initialView(descriptor)` the view state it starts in.

A typical test: build a world (as `src/game/new-game.ts` does), `applyPreset` one of `descriptorFor('PL3-CAB1').presets`, apply `control.action(world, 'off')` with the world's reducer, then `readAll` and assert. Never mutate the player's world for this.

## Drive the world headlessly

All of these are development-only (`import.meta.env.DEV`) unless said.

- **`&slot=itest`** (any `[a-z0-9-]{1,24}`): a throwaway save slot of its own, so a test never touches the player's `dev` slot or another tab's world (`src/toolkit/save/world-store.ts`).
- **`window.poolWorld.store()`**: the room's world store. `poolWorld.store().dispatch({ type: 'jacuzzi/cabinet', action: { act: 'power', on: false } })`.
- **`&noclip=true`**: the free camera from the start; console `noclip [on|off]`.
- **`window.exhibitRoom`** (exhibit dev rooms of `plant-room.ts`): `exhibits()` lists each exhibit's `{ title, x, z, yaw }`; `place(x, z, yaw?, pitch?)` stands the walker in metres and degrees; `use(x, y)` works whatever is at screen position (−1 to 1, centre 0,0) as a click would. Use `use` when synthetic mouse clicks do not reach the game.
- **The console** (backquote; `help [command]` lists them all; source `src/toolkit/console/logic/commands.ts`):
  - Reading: `status [name]`, `get <path>` (`get pools.pool_02.temperature`), `valves`, `switches`, `motors`, `doses [pool]`, `chemicals`, `weather`, `co2`, `history`, `log [filter]`, `condump` (downloads the log).
  - Acting: `act <json>` (any world action: `act {"type":"lighting/supply","on":false}`), `open`/`shut <tag>`, `switch <tag> on|off`, `starter <tag> hand|off|auto|start|stop|reset`, `pause`, `unpause`, `reset` (New Game state, player not moved), `goto <room>`, `torch`.
  - Stand-ins: `dose <pool> <chemical> <amount>[unit] [<rate>/min|/h | / <time>] [balance-tank|pool]`: all at once, at a rate per minute or per hour (`dose pool_01 bicarbonate 17kg 1kg/min`, `… 17kg 1kg/h`), or spread over a time (`17kg / 3h`, `17kg/3h`). Into the balance tank unless `pool` is said. `dilute <pool> <m³>`; `test_kit <pool>` (the poolside kit's reading); `weather <°C>` holds a test outside temperature, `weather live` releases it; `co2 swap` refills the spent rack.

## Reproduce a player's bug

- **The World state box** in the `?dev` panel (`src/toolkit/save/world-transfer-panel.ts`, on every build): choose a slot (`dev (your game)` is the player's), then **Download** its state file, **Upload…** one into the chosen slot (its previous save is kept as `:previous`, and open tabs take it up), or **Report a bug…** (downloads the file and opens the GitHub issue form with version, browser and location filled in).
- **A state file** (`src/game/state-file.ts`, format `pool-plant-state`): `game` (version, build, slot), `exported`, `worldTime`, `location` (the player's `?room=…` query), `environment` (browser, platform, screen, settings), `save` (the save as stored), `events` (the slot's persistent event log, its last game-day) and `commands` (the console's last 100 typed commands). Read `events` and `commands` first: they usually say what the player did.
- **The issue template** is `.github/ISSUE_TEMPLATE/bug_report.yml`; it asks for the state file.
- **To reproduce**: open `?slot=<scratch>&dev` once so the slot exists, pick it in the World state box, Upload the file; the panel then offers a link to the file's `location`. Add `&slot=<scratch>` to that link if it lacks it, so the player's world is never loaded into your `dev` slot. Then look, `get`, `status` and step as above.

## Pose links (the fallback)

A position in the link places the walker: `?room=<room>&x=…&z=…[&y=…]&yaw=…&pitch=…[&zoom=…][&roll=…][&noclip=true]`, metres and degrees. Yaw 0 looks north (−z), 90 east (+x), 180 south, 270 west; the view direction is (sin yaw, −cos yaw). Roll is degrees clockwise. The console's `cam` and a look link's `link` field give one. Prefer a look link: it survives layout changes and refuses clearly; a pose link silently goes stale when a room moves.

## Audits (in progress)

These are being built now; the sections will be filled as each lands on `main`.

- **127, everything lookable** (done; plan `doc/plans/127-everything-lookable.md`). `npm run look:audit` (`node scripts/look-audit.ts [rooms…]`) needs the dev server running (it never starts one); it asks the server for the game's `ROOMS`, opens `?room=<room>&audit=look&shot=1` in headless Chrome, one fresh tab a room, waits for `window.__poolLookAudit` (`{ room, done, audit | error }`), and writes `doc/look-audit.json` (each room's counts, failing count, timing and findings) and `doc/look-audit.md` (the headline table). Named rooms merge into the existing report. It exits non-zero when a room fails or cannot be built; findings are excused only in `KNOWN_UNLOOKABLE` (`src/toolkit/gallery/logic/look-audit.ts`, empty: 132 works them off). Screens: `bench.html?bench=lookables&room=<room>` (one room built in a frame, every finding and every target's record) and `bench.html?bench=lookables` (every room's summary from the committed report, with a button to rerun all in the page). Shared with 129: the scanner `src/toolkit/gallery/views/look-audit-scene.ts` (`scanScene`, `auditBuiltRoom`), the pure records `logic/look-audit.ts` (`lookTargets`, `TargetRecord`, `auditRoom`), the adapter `?audit=look` in `src/main.ts`, and the one classification `logic/object-class.ts` (`objectClass`: `architectural` for signs, fire fittings and doors).
- **129, room audit** (done; plan `doc/plans/129-room-audit.md`). `bench.html?bench=room-audit&room=<room>` (dev server; old ids resolve), also each room's **Audit** item in the `?dev` catalogue. Builds the room once through 127's adapter and scanner (no second scanner), then lists every look target, named first: name or tag (look link, asset id), type (kind, maker, class), model node, connections (`drawn`, `model only`, `boundary`, each linked to its row), what controls it and what it controls (131's descriptor `targets`), board copies (`copy of` / `copied by`), what it shows at a fresh world, and flags (unnamed, unbound, orphan, duplicate, no maker, missing control), with counts and a flagged-only filter; unnamed geometry and decoration are listed apart. `window.__roomAudit` holds the result. Pure parts for scripts and tests: `src/toolkit/gallery/logic/room-audit.ts` (`roomAuditRows(audit, input)`, `auditNetwork`, `connectionsOf`, `controlledBy`, `controlsOf`, `boardCopies`).
- **130, item audit, magic room and magic page** (done; plan `doc/plans/130-item-audit.md`). Development pages on `bench.html`, none a room of the building (never in `ROOMS`, never in the saved position, no world store opened):
  - `bench.html?bench=item-audit&kind=<kind>` (also each kind's **Item audit** link in the `?dev` catalogue's Game objects): what it is (kind, class, maker, product, purpose, deprecated), its parts (the built item's worked parts, named or flagged unnamed, and the catalogue's nested parts), its states (the adapter's curated looks and pages, 131's presets and controls), every counted placement grouped by room with look links and room-audit rows (`#row-<ref>`), the rooms not counted from data each with a **Scan** button (one room built by 127's adapter in a frame, copies matched by kind or name: how dev0's weather console is found), and the dev rooms that hold it. `window.__itemAudit` holds `{ kind, adapter, placements }`.
  - `bench.html?bench=magic-room&kind=<kind>`: a room generated round the item, drawn as a CAD sheet (`views/cad-sheet.ts`, styles in `logic/cad-views.ts`): floor, walls and ceiling ruled in 1 m squares with 10 cm subdivisions on whole world metres, a wall item's stub as centimetre graph paper (1 cm, 10 cm, 1 m lines) to read its size off, flat shadowless light, a small origin marker on the floor at the room's centre and an X/Y/Z triad (red, green, blue; y up, −z north) in the bottom-left corner that turns with the camera. The room is generated (`logic/magic-room-layout.ts`, `magicRoomLayout`: clearance all round, wall items on a stub, hanging ones from the ceiling), built by the game's own builder through its adapter (`views/magic-adapters.ts`, `adapterFor`: explicit adapters, else the kind's model exhibit in `MODELS`). Where it has curated looks or pages, a Penfold signpost panel's LOOK and PAGE selectors set them (only the weather station has them yet). `window.magicRoom`: `layout`, `looks`, `pages`, `place(x, z, yawDeg, pitchDeg)`, `look(i)`, `page(i)`, `use(x, y)`.
  - `bench.html?bench=magic-page&kind=<kind>`: a kind with no adapter in words, from the model and 131's descriptors (`logic/magic-page.ts`, `magicPage`, `magicPageText`). `window.__magicPage` holds it.
  - Pure parts: `logic/item-audit.ts` (links, `groupPlacements`, `uncountedRooms`, `scanMatches`, `panelChoices`, `choiceAt`, `DEPRECATED_KINDS`, `deprecationOf`). Later missions add page sections through `ITEM_AUDIT_SECTIONS` in `views/item-audit-page.ts`.
- **133, CAD views on the item audit page** (done; plan `doc/plans/133-item-cad-views.md`). Each item audit page (`bench.html?bench=item-audit&kind=<kind>`) opens with TOP, FRONT, SIDE and PERSPECTIVE views of the kind, drawn by its 130 adapter off-screen on a plain sheet under the magic room's flat light (`views/cad-views.ts`, registered in `ITEM_AUDIT_SECTIONS` and placed near the top by `dataset.auditPlace = 'top'`). The flat views share one scale and carry their sizes in millimetres and a scale bar; TOP has the item's front (+z) at the bottom, SIDE shows its right-hand side as seen from the front. First open renders them; later opens read IndexedDB (`pool-plant-cad-views`), keyed by kind, variant, `CAD_RENDER_VERSION`, the game's version and build and a fingerprint of the built object, so a changed builder redraws. `window.__cadViews` is `{ kind, done, fromCache, key }`. A kind with no 3D form shows its magic page in a frame. Pure parts: `logic/cad-views.ts` (`CAD_VIEWS`, `orthoFrame`, `sheetScale`, `dimensionsMm`, `viewDimensions`, `scaleBar`, `perspectivePose`, `fingerprint`, `cadCacheKey`, `isFresh`). For 135: `renderCadViews(adapter, { variant })` and `CAD_VIEW_MEASURES`.
- **135, HIGH and LOW poly versions and visual cost** (done; plan `doc/plans/135-poly-versions-and-visual-cost.md`). Every magic room has a Penfold signpost whose POLY selector swaps HIGH (the view builder) and LOW (the adapter's `buildLow`, else `createFarVersion`), with a small cost readout beside it. Both versions are measured live as the room opens (`views/visual-cost.ts`, `measureVisualCost`, as the component benchmark measures: draws, triangles, materials, textures and bytes, update µs, uploads running; no idle phase), and the record kept per viewer in `localStorage` (`pool.visual-cost.<kind>`). `window.magicRoom.poly(i)`, `variant`, `measuring` (wait for false), `costs`, `versions`. The item audit page shows both versions' last measurement side by side near the top, with its age and a link to measure afresh (`window.__visualCost`); the CAD views have a HIGH · LOW selector (`window.__cadViews.variant`), each version cached apart. The `?dev` catalogue's Game objects sort by visual cost or weight and filter to measured kinds, from stored figures only. Pure parts: `logic/visual-cost.ts` (`budgetStatus`, `weightOf`, `usageOfRooms`, `costSummary`, `loadRecord`, `saveRecord`, `recordAge`, `sortByCost`).

## Read the live plant model in a browser

Mission 134 exposes a read-only browser surface beside the game. `window.__poolDiagnostics` has versioned `listSystems()`, `listEquipment({ room?, kind?, state?, offset?, limit? })`, `getEquipment(ref)`, `getConnections(ref)`, `listAlarms({ activeOnly? })`, `getAlarm(ref)`, `getRecentEvents({ subject?, limit? })`, `getCoverage()`, `getWashState()` and `getViewContext()` methods. `state` is `known` or `unavailable`. Equipment refs and asset IDs are accepted without case; results are bounded plain data, never the mutable `World` or a dispatch method. `getConnections(ref)` returns the room schematic's touching links, named ends, related equipment refs and valve positions when modelled. `getWashState()` reports the controller's raw modes, lockouts, pit level, flow and current programme step, without a separate explanation. `getCoverage()` reports readable and unreadable counts by kind. A missing reader is `stateAvailable: false`, never inferred to mean OFF or SHUT. The selectors are pure functions in `src/game/diagnostics/plant-context.ts` and `plant-connections.ts`.

The page also carries a short semantic summary and room index outside the canvas for browser assistants that read DOM or accessibility text. Open `#plant-context-report` on a game URL for a readable report with a search box, current room from the URL, wash conditions, recent events, schematic connections, inspection links, a copy button and an AI-context off switch. The GAME panel in the Esc menu has PLANT REPORT (Copy Plant Report in its plain fallback), which copies the current full report; it respects the off switch. The switch is local to this browser. Headless Chrome has verified the report, search, links, API, plain-menu copy and off switch; browser-extension interoperability still needs testing with Claude, Gemini and ChatGPT in Chrome. The report does not provide a curated fault explanation or adventure narration (both later mission 134 iterations).

## Benchmarks, dev servers and pictures

- **Component benchmark**: `bench.html?bench=components&only=<name>` (add `&slot=bench094` to keep its world apart; `secs` sets each phase's length). New displays must stay within its budget, or be listed in `KNOWN_OVER_BUDGET` (`src/toolkit/gallery/logic/component-bench.ts`) and flagged in `TODO.md`.
- **Shared dev servers**, one per machine, open to the LAN: the MacBook Pro at `http://192.168.86.87:5175/` and the Air (`trebizondo`) at `http://192.168.86.22:5175/`. Do not restart them or start a second on 5175; your own throwaway server goes on another port and is stopped when you are done. `scripts/look.ts` uses `127.0.0.1:5175` by default.
- **Pictures for the owner**: send each image separately, in order, with a short caption. Never a contact sheet, montage or grid. `shot=1` look links give clean frames.

## Rules of thumb for agents

- Prefer look links over hand-built poses; read `window.__poolLook` (or the script's output) rather than judging a screenshot.
- Prefer the pure modules (`lookCatalogue`, `kindCatalogue`, `placedRoomItems`, `objectDescriptors`, `applyPreset`, `readAll`) in a test or script over opening a browser.
- Read machine-readable outputs: `__poolLook`, `__poolLookAudit`, `doc/look-audit.json`, a state file's `events` and `commands`, the console's `get`.
- Use `&slot=itest` (or another scratch slot) for any experiment that changes the world.
- Never write a plant tag whole as a string literal: build it from its parts, as the plant does. `src/game/plant/registration.test.ts` reads the code for whole tags and fails on unregistered ones.
- One full `npm test` per machine at a time, announced on the mailbox; use targeted tests with `--maxWorkers=2` meanwhile.
- When you add or change a tool here, update this guide in the same commit.
