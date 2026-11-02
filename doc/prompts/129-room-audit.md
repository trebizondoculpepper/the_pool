# 129: The room audit page

The owner, 2026-11-02: a separate mission, not part of 127. Brief only; not started until the owner says. Read `CLAUDE.md` first, then 125 (look links), 126 (the universal catalogue, whose Rooms category gives each room a small menu with an **Audit** item linking here) and 127 (everything lookable).

## What it is for

A more detailed view of one room than the catalogue gives: a cheap way to explore a room without walking round it, and to find out what is connected to what, which things are properly named and numbered, which are correctly wired, and which have been forgotten. The catalogue (126) lists what the data knows; the audit lists everything the room's scene actually holds, so it is the one place an unnamed thing shows up.

## How it works

- **Built from the room's scene, off-screen:** the page builds the one room through 127's room-build adapter (without the player in it), walks every object once, lists them, and disposes of the temporary room after the scan. Nothing per frame; one room at a time.
- **Where it lives:** a development page beside the component benchmark, at the URL already in code: `auditLink` (`src/toolkit/gallery/logic/look-catalogue.ts:124`) returns `bench.html?bench=room-audit&room=<id>`, which 126's catalogue stores on its (disabled) Audit item. The page serves that URL (old ids resolved through `ROOM_ALIASES`) and enables the item.
- **Shared with 127:** 127 owns the one scene scanner (inventory and classification), its per-target record and the room-build adapter; 129 uses them and adds its graph, state and control findings, so the two audits never disagree. The owner walk is `lookOwners` in `src/toolkit/gallery/views/look-scene.ts` (line 77); `world-in-model-scene.ts` exports only `unboundInScene`, the names of unbound owners, and neither yet classifies every unmarked mesh. If 129 is built first, it builds that scanner in the shared module 127 then owns.
- **Rows:** each row is keyed by 125's resolved look target, with its model binding, asset id and scene owner kept as separate fields, so 130's placement rows can link to stable row refs.

## What it lists

Every object in the room: the named ones first, by name or tag, then the unnamed ones below, by where they sit in the scene. For each:

- **Name or tag**, as the player and the inspection overlay see it, with its look link (125) and, if registered, its asset id.
- **Type:** its component kind (valve, pump, mimic board, switch-fuse…), and its maker's brand where it has one.
- **Model node:** where it is attached in the world simulation (its node, fitting or link path in the room's enhanced network, or other world binding), or _unbound_.
- **Connects to:** its model connections through the model's ports, each labelled `drawn` (a pipe, cable, conduit or busbar laid in the room), `model only` (a link not drawn, such as a signal; the Jacuzzi schematic has some, and the control bus, `src/toolkit/gallery/logic/control-bus.ts`, ends at an imagined network beyond the room) or `boundary` (it leaves the room). Each neighbour links to its own row, or to another room's audit.
- **Controlled by:** what drives it: the buttons, knobs, switches and mimic copies that act on it, and in which rooms (a local panel and its control-room copy, for example), with links to their rows, from mission 131's control descriptors. Where it drives something itself (a panel's buttons), the reverse: what it controls.
- **Shows:** what its own displays, lamps and position show now, derived through the existing inspection path (`src/game/plant/component-inspection.ts`) at a stated world snapshot, by the overlay's no-peeking rule. A display culled or unreadable (see 124) is not a missing object.

## What it flags

- **Unnamed:** an engineering item with no tag or name.
- **Unbound:** a named engineering item with no model node, which breaks the rule that nothing is put in the visual world that is not already in the model. Exempt: named worded signs (127 makes them named but model-free), controls that inherit a bound parent (as `unboundInScene` already allows), and rooms with no enhanced network.
- **Orphan:** a bound node with no connections in the model at all; a schematic boundary with no in-room neighbour is not an orphan.
- **Duplicate:** two things sharing one tag or asset id.
- **No maker:** reuses 126's finding and its softer severity (`kind-catalogue.ts` treats missing maker data as a note), not a separate hard flag.
- **Missing controls:** only where controls are described as data: a control the data expects that no room holds (it may be in another room), or a control in data wired to nothing. Until controls are data generally (see Shared foundation), this flag cannot be complete and the page says so.
- Decorative items (`decorative`, `decorativeKind`) are listed apart and not flagged.

A summary at the top counts each flag, and the page can filter to flagged rows only.

## The known gap: "controlled by"

Which control drives which action is mostly written in view code (about 62 view modules; see `doc/research/text-adventure-mode.md`). The column is filled from mission 131's shared control descriptors, which come first (the owner, 2026-11-02), and fills in further as 131 covers more kinds. The audit ships without waiting for full coverage and does not label its columns partial: a blank cell is itself the sign that something is not yet described (the owner, 2026-11-02).

## Acceptance

- The audit of the Jacuzzi plant room (`plant_pool_03`) lists its cabinet `PL3-CAB1`, filter, balance tank, day tanks, its 18 valves (12 cabinet and tank valves in `src/game/plant/jacuzzi-schematic.ts`, and six chemical valves `dayTanks()` adds in `src/game/plant/schematic-parts.ts`) and its one power isolator with their nodes and connections, and any unnamed objects below them.
- The control room's audit shows each mimic copy as controlled from, or mirroring, its plant room's board.
- Every flag type is shown working on a real room or a test fixture; pure parts (classification, flags, the connection graph) live in `logic/` with tests beside them.
- It opens within a few seconds for the largest plant room, and does nothing while idle; the plan states whether that time includes module load and scene build.

## Shared foundation

"Controlled by" reads mission 131's shared kind/part/control/view-state descriptor (control ids, the world action each drives, visible readings, state presets), the same data 128's text verbs and 130's magic-room presets read (the owner, 2026-11-02: 131 is a separate mission, done first).

## Open questions for the owner

1. Should named worded signs and working doors appear in the main audit with "no model binding" as an accepted class, or in a separate fixtures section?

## Records

The plan in `doc/plans/129-room-audit.md`; `TODO.md`; `CHANGELOG.md` under Unreleased once built; a diary entry.
