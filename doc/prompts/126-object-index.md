# 126: The universal catalogue: every room's contents and every kind of game object, with how well each is named

The owner, 2026-11-02, first: the dev panel's room list "is just a list of links to rooms … what if that list now becomes a collapsible list of lookable things? … rather than just clicking on dev 3, you expand the list, and within that you see … things you can look at, and so it effectively jumps the player directly to the thing of interest." Then, the same day, the decision that rewrote this brief: the dev panel becomes a **universal catalogue** in two categories, **Rooms** (each room opening into its named components, each with a look link) and **Game objects** (every kind of game object in the world, each opening into its copies and their parts, so that whatever is not properly named shows, flagged), with filters on the game objects (used anywhere; used outside the dev rooms; badly named) and, for each kind, a count of where it is used. Implement now. The second of three missions: 125 makes look links (`?room=…&look=…&mode=…`); this one lists what there is and how well it is named; 127 makes everything lookable and audits the scene. Read `CLAUDE.md`, mission 125's brief and plan, and 127's brief first.

## Depends on

- **Mission 125** (merged, 95347a2d): its ref form, its register lookup (`src/toolkit/gallery/logic/look-ref.ts`) and its look hook on rooms.
- **The catalogue interface** (below) is shared with 127 and with 128's text mode (`doc/research/text-adventure-mode.md`).

## What there is now (checked 2026-11-02)

- **The dev panel** (`?dev`) is static HTML in `index.html`'s `#room-index`, revealed by `src/main.ts`'s `?dev` branch: sections of room links, 64 in all, not every room in `ROOMS` (`src/toolkit/gallery/logic/dev-room-links.ts`).
- **Kinds of game object:** `EQUIPMENT_KINDS` (`src/game/plant/equipment-kinds.ts`) is the registry of kinds: `PLACED_KINDS` (what the rooms' layouts place, scenery included) and `OTHER_KINDS` (pumps, valves, pipework and the other parts the model and the register name), each with its tag code, class (`plant`, `non-plant`, `decorative`), word, purpose and, where its model gives one, its maker (`brand`). Signs (`sign:<id>`, `building-signs.ts`) are placed beside them but have no kind.
- **Where they are used:** `roomEquipment(room)` (`src/toolkit/gallery/logic/room-equipment.ts`) lists each equipped room's placed items from data, no scene; `countUsage` (`logic/component-bench.ts`) counts item keys per room, fed by the component benchmark's `roomItems()` (`views/component-bench.ts`, which runs the whole layout). Beyond the layouts: `INSTALLED_FIXTURES`, `INSTALLED_VALVES`, `ROOM_SWITCH_FUSES` and `MOTORS` name things in their rooms. The development rooms' exhibits are in their room modules' `EXHIBITS` (titles beside Three.js builders); `MODELS` (`views/room-equipment.ts`) says which exhibit is which placed kind's model.
- **Names:** `INSTALLED_ASSET_IDS` gives each placed item its asset id and hierarchical tag (`room|item.key|item.label` → `asset-1308`, `BH-CP3`); `plantInventory` (`src/game/plant/equipment-catalogue.ts`) is the bill of parts: model parts (`PL2-P1-P1`), placed equipment, fixtures, valves, switch-fuses, with their kinds, makers and descriptions.

## What "properly named" means

Grounded in the project's rules (tags derived from the model and hierarchical; every engineering item carries its maker's brand; a name where there is no tag; decoration exempt) and 127's three identities. Judged from data alone, so it says what the data says, not what a scene shows.

- **A kind** is properly named when it is in `EQUIPMENT_KINDS` with its word and purpose, and, unless it is decorative, it has a maker (`brand`) or every copy of it names its own (a fixture's brand). Findings: **no kind** (a placed key, such as `sign`, or a dev-room exhibit no kind claims); **no maker** (an engineering kind, `plant` or `non-plant`, with no brand).
- **A copy** in a non-dev room is properly named when it has a register entry: an asset id and a tag beginning with its room's code and its kind's code (`BH-CP3`: boiler house, control panel). A decorative copy needs no tag (exempt). Findings: **no tag** (an engineering copy with no register entry; `equipmentCatalogue` already refuses most, so few are expected).
- **A copy in a dev room** is named by its exhibit's title (dev rooms start fresh and are not in the register): properly named if it has a title. Not a finding that it has no tag.
- **A part** (a model part or register entry under a copy's tag, `PL2-P1-P1` under `PL2-P1`) is properly named when its tag is hierarchical under its owner's and it has a name of its own: not empty, not just its tag, and not a bare word of its kind ("Valve", "Pump"). Findings: **generic name** (empty, its own tag, a bare word such as "Valve", or, for an untagged thing outside the dev rooms, its kind's word alone; a tagged thing or a dev room's exhibit may be called by its kind's word, its tag or room telling which), **duplicate name** (two untagged things of one name in a room, so a ref needs `#n`).
- **Decorative** kinds and copies (set dressing; the safety shower, ruled decorative) are exempt from every finding, and shown as exempt.

**No maker recorded** is a softer note, not a naming finding: the kinds' register records a maker only where the model names one (74 of the kinds have none in data, though many of their models carry a badge), so it is shown in grey and does not count towards "badly named". The panel flags each finding in words beside the thing, and the kind's row carries the worst of its own and its copies' and parts'. The definition is in one pure function (`namingFindings`), tested, so the panel, the console and 127's audit agree.

## The catalogue (shared with 127 and 128)

Pure, tested, built from data alone, never from a scene, in `src/toolkit/gallery/logic/`:

- **`lookCatalogue(room?)`** (`look-catalogue.ts`): entries of room, ref (125's form: the tag, else the slug of the name), title, kind, asset id, model binding where the data gives one (the model's node path for model parts and placed items in rooms built from a schematic), aliases for search (asset id, the kind's word, its maker), its parts (from the bill of parts), the modes that suit it, its naming findings, and whether a look link is expected to resolve (a placed item in a room with 125's look hook). 128 reads it as each room's contents; 127 checks the scene against it.
- **`kindCatalogue()`** (`kind-catalogue.ts`): every kind of game object, from `EQUIPMENT_KINDS`, the placed keys, the signs and the dev rooms' exhibits: its word, class, maker, purpose, its copies (room, tag or title, asset id, ref) and their parts, its usage (copies in all, the rooms, copies outside the dev rooms) and its findings.
- **Usage gathered in logic:** each room's placed keys come from `roomEquipment` (and the signs from `ROOM_SIGNS`), with the register's other rooms (fixtures, valves, switch-fuses, motors) added by their room, in a pure `roomUsage()` that `countUsage` is fed from, so the benchmark and the catalogue count alike.
- **Dev rooms' exhibits** are read from their room modules' `EXHIBITS` titles (and `MODELS` for which kind each is) when the catalogue opens: a module import, no scene built. The pure functions take them as input. Moving each dev room's metadata into a pure module beside it (so 128 can read it without Three.js) stays for 127, room by room.
- **Dev rooms** are the numbered rooms (`devN`, with the old names in `ROOM_ALIASES`); everything else is a non-dev room.

## What the panel shows

At the top of `?dev`, above the existing room sections (kept for now), a catalogue with two categories:

- **Rooms:** every room in `ROOMS`, each a `details`/`summary` with its count and a small menu of its own (the owner, 2026-11-02): **Open** (the room), **Catalogue** (opens its entry here) and **Audit** (the per-room audit page of mission 129, `doc/prompts/129-room-audit.md`, shown disabled, "coming in 129", until that page exists; 129 settles its URL and points this item at it). Opened, a room lists its catalogue entries one a line: tag (or title), name, asset id and findings, each a look link (`front`) where one is expected to resolve, with small `left`, `right`, `above` links, and its parts under it. A room whose contents are not in data (museum halls' bespoke builders, the pool halls, the corridors, most dev rooms) says **not counted (127)**, plainly.
- **Game objects:** every kind, a `details` row each: its word and key, class, maker, copies in all and outside the dev rooms, and findings. Opened: its purpose, an **Item audit** link (mission 130's page: the item's parts and states, every placement, a room showing it alone; shown disabled, "coming in 130", until it exists), the rooms it is in (links, each with its count), and every one of its copies, however many (valves run to hundreds), each with its look link, asset id and parts.
- **Filters** on game objects: used at least once anywhere; used at least once outside the dev rooms; badly named. And a search box over both categories (tag, name, asset id, kind, maker, room).
- **Remembered:** the category, the filters and the search, per viewer (`localStorage`, every read and write wrapped).
- **Touch and speed:** tap targets at least 40 px tall; the panel draws from data only and lists a closed row's contents only when it is opened.
- **The console:** `looks` lists the present room's catalogue entries with their refs; `catalogue <kind>` prints a kind's usage and findings.
- **The bill of parts** giving a look link to each row with a catalogue entry is left as a follow-up (`TODO.md`): `plant-manual.ts` is shared, and the catalogue already links every row of it that has one.

## Acceptance

- **Pure tests:** usage counts agree with `countUsage` for the equipped rooms; every placed item in the equipped rooms appears once in its room's catalogue with its register tag; BH-CP3 is found by "cm6", "BH-CP3" and "asset-1308"; refs are unique within a room; the naming rules each have a case (decorative exempt, no maker, generic part name, dev copy named by title).
- **In the browser** (screenshots in the plan): the Rooms category with a room opened; the Game objects category; one kind opened with its copies and usage; the badly named filter.
- **Honest coverage:** the plan lists which rooms are counted and which say not counted.

## What stays for 127

Every look link listed here resolving in its built room (127's audit, the browser check); objects marked only in the scene (museum halls, pool halls, corridors, dev0's boards) entering the catalogue; dev rooms' metadata in pure modules; named parts below the model (a CM6's display) entering the parts lists; worded signs changing from decorative to named; the per-room unlabelled count from 127's report.

## Not in this mission

No change to how a look link chooses its view (125); no new marks in scenes (127). No world state.

## Records

The plan in `doc/plans/126-object-index.md`; the CHANGELOG under Unreleased (`### Added`); `TODO.md`: this mission and its follow-ups.
