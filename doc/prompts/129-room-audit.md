# 129: The room audit page

The owner, 2026-11-02: a separate mission, not part of 127. Brief only; not started until the owner says. Read `CLAUDE.md` first, then 125 (look links), 126 (the universal catalogue, whose Rooms category gives each room a small menu with an **Audit** item linking here) and 127 (everything lookable).

## What it is for

A more detailed view of one room than the catalogue gives: a cheap way to explore a room without walking round it, and to find out what is connected to what, which things are properly named and numbered, which are correctly wired, and which have been forgotten. The catalogue (126) lists what the data knows; the audit lists everything the room's scene actually holds, so it is the one place an unnamed thing shows up.

## How it works

- **Built from the room's scene, off-screen:** the page builds the one room (as the component benchmark and 127's audit build rooms, without the player in it), walks every object once, and lists them. Nothing per frame; one room at a time.
- **Where it lives:** a development page beside the component benchmark, at a URL taking the room id (old ids resolved through `ROOM_ALIASES`), linked from the catalogue's per-room menu (126). Settle the URL in the plan, and make 126's link point at it.
- **Shared with 127:** reuse 127's owner walk and lookability classification where it exists (`world-in-model-scene.ts`'s owner walk, `markComponent` identities), so the two never disagree; if 129 is built first, build that walk in a shared module 127 then uses.

## What it lists

Every object in the room: the named ones first, by name or tag, then the unnamed ones below, by where they sit in the scene. For each:

- **Name or tag**, as the player and the inspection overlay see it, with its look link (125) and, if registered, its asset id.
- **Type:** its component kind (valve, pump, mimic board, switch-fuse…), and its maker's brand where it has one.
- **Model node:** where it is attached in the world simulation (its node, fitting or link path in the room's enhanced network, or other world binding), or _unbound_.
- **Connects to:** its neighbours through the model's ports: pipes, cables, conduits and busbars laid by the plumber. Each neighbour links to its own row, or to another room's audit when the connection leaves the room.
- **Controlled by:** what drives it: the buttons, knobs, switches and mimic copies that act on it, and in which rooms (a local panel and its control-room copy, for example), with links to their rows. Where it drives something itself (a panel's buttons), the reverse: what it controls.
- **Shows:** what its own displays, lamps and position show now, by the overlay's no-peeking rule.

## What it flags

- **Unnamed:** an engineering item with no tag or name.
- **Unbound:** a named engineering item with no model node, which breaks the rule that nothing is put in the visual world that is not already in the model.
- **Orphan:** a bound node with no connections.
- **Duplicate:** two things sharing one tag or asset id.
- **No maker:** an engineering item without a brand.
- **Missing controls:** a control the model or schematic expects that the room does not hold, or a control wired to nothing.
- Decorative items (`decorative`, `decorativeKind`) are listed apart and not flagged.

A summary at the top counts each flag, and the page can filter to flagged rows only.

## The known gap: "controlled by"

Which control drives which action is mostly written in view code (about 62 view modules; see `doc/research/text-adventure-mode.md`). The column is complete only where controls are described as data (mimic boards' specs, room equipment), and partial elsewhere; the page says which rows it could not resolve rather than leaving them blank. Lifting controls into data, which text adventure mode (128) also needs, completes it; record that in `TODO.md`, not in this mission.

## Acceptance

- The audit of the Jacuzzi plant room (`plant_pool_03`) lists its cabinet `PL3-CAB1`, filter, balance tank, day tanks, isolator and all 19 valves with their nodes and connections, and any unnamed objects below them.
- The control room's audit shows each mimic copy as controlled from, or mirroring, its plant room's board.
- Every flag type is shown working on a real room or a test fixture; pure parts (classification, flags, the connection graph) live in `logic/` with tests beside them.
- It opens within a few seconds for the largest plant room, and does nothing while idle.

## Records

The plan in `doc/plans/129-room-audit.md`; `TODO.md`; `CHANGELOG.md` under Unreleased once built; a diary entry.
