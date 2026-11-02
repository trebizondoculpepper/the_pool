# 129: The room audit page — plan and record

Brief: `doc/prompts/129-room-audit.md`. The owner said go on 2026-11-02, scoped to building the screen and checking it on two rooms (`plant_pool_03` and `control_room`), not auditing every room.

## Shape

- **Page:** `bench.html?bench=room-audit&room=<id>` (dev server only), served by `src/bench.ts` through `src/toolkit/gallery/views/room-audit-page.ts`. Old room ids resolve through `ROOM_ALIASES` (`resolveRoomId`) and the address is corrected. 126's catalogue (`?dev`, Rooms tab) enables each room's **Audit** menu item, which links here (`auditLink` in `look-catalogue.ts`).
- **Reuse of 127, no second scanner:** the page builds the room in a frame through 127's room-build adapter (`?audit=look` in `main.ts`), waits for its `RoomAudit` (`auditInFrame`, exported by `look-audit-page.ts`) and removes the frame. Rows are 127's `TargetRecord`s, keyed by their look ref (125), with tag, name, model binding and asset id as separate fields; classes come from 127's one classification (`object-class.ts`). The two audits therefore never disagree.
- **Pure parts** (`src/toolkit/gallery/logic/room-audit.ts`, tests beside it): `auditNetwork` (the room's enhanced network from `world-in-model.ts`'s new `roomNetwork`, with each link's fittings in order), `connectionsOf`, `controlledBy`, `controlsOf`, `boardCopies` / `copiesOf`, `shownText` and `roomAuditRows`, which builds the rows, flags and counts.

## Columns

- **Name or tag:** the tag (else name, else look ref) as a look link (125), the name under a tag, and the catalogue's asset id.
- **Type:** the kind's word, its maker (from 126's kind catalogue and the brands), and its class (`architectural` shown, never flagged unbound).
- **Model node:** the binding (`node:…`, `fitting:…`, `link:…`), or `unbound`.
- **Connects to:** along every link the object is on, its neighbour each side (the next fitting, or the link's other end), linked to the neighbour's row, labelled `boundary` (a boundary node, or a neighbour not in this room's scene), `drawn` (the link is drawn in the room) or `model only` (a signal or other link not laid), with medium and link id.
- **Controlled by · controls · copies:** 131's descriptor controls (any room) whose `targets` name the row (by ref or tag anywhere, by model ref in their own room), with room and `local`; the row's own controls that work something else (`→ works …`); and board copies: `copy of <room>'s <node>` / `copied by …`. Copies are found by kind (a control-room mimic whose kind a plant room's board shares) and, where the kinds differ, from `NAMED_COPIES` (the Jacuzzi and the wet hall's fresh-water mimics).
- **Shows:** the descriptor's readings (no-peeking: only its own lamps, displays, gauges and positions) at a stated snapshot, a fresh world (`newWorld()`, time 0).
- **Flags.**

A blank cell is the sign that something is not yet described (the owner): no column is labelled partial.

## Flags

- **unnamed:** an engineering row with no tag or name, and every unlabelled group 127 finds (listed apart, "by where it sits").
- **unbound:** a named engineering row (plant, non-plant or unclassified) with no model binding, in a room with an enhanced network. Architectural and decorative rows are exempt; controls are parts, never rows, so they inherit their parent.
- **orphan:** a bound node with no connections in the model; a boundary node is not an orphan.
- **duplicate:** 127's duplicate-tag finding, or two rows sharing an asset id.
- **no maker:** 126's soft `no-maker` note, shown softer.
- **missing control:** a descriptor control in this room whose target nothing holds (no row, descriptor or network object), and 127's unmarked controls (a control in data the scene does not mark as a part). The page says this cannot be complete until every kind is described.
- Decorative rows are listed apart and never flagged. The page filters to flagged rows only.

## Timing

The page states it: the time from asking to drawing, which includes the frame's module load, the scene build and the scan (a few seconds for a plant room). Nothing runs while idle: one build, one scan, the frame removed.

## Checked (2026-11-02)

Only the screen was exercised (the owner: build the machinery; running the audit across rooms is a later task, once 129, 130, 133, 135 and 136 are in place). The page was opened for `plant_pool_03` (its cabinet, filter, balance tank, day tanks, 18 valves and isolator listed with nodes, connections and controls) and `control_room` (CR-MP9 shown as a copy of the Jacuzzi plant room's mimic). No findings are recorded here.

## Follow-ups (in `TODO.md`)

- Name more control-room copies' boards in `NAMED_COPIES` where kinds differ.
- Run the audit over the rooms when the owner asks, after the rest of the audit machinery lands.
