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

The page states it: the time from asking to drawing, which includes the frame's module load, the scene build and the scan (plant_pool_03: about 3–4 s, of which scene build 0.6–0.8 s and scan 1.6–2.1 s; control_room about 4.3 s). Nothing runs while idle: one build, one scan, the frame removed.

## Checked (2026-11-02)

- `plant_pool_03`: 59 rows. PL3-CAB1, the filter PL3-F1, the balance tank PL3-BT1, both day tanks, all 18 valves and the isolator with nodes and connections; the cabinet controlled by its own ten controls and the isolator's handle; each valve by its handle (or override) and the valve panel's OPEN/SHUT. Flags: 2 unnamed (`node:mimic`, the Jacuzzi mimic, and `node:plant-room-lights`, both bound but unnamed), 6 unbound (the two DoseCell heads, Equipment doors, Plant room door, the Synclex amplifier and music source), 1 orphan (plant-room lights), 0 duplicate, 21 no maker, 44 missing controls (127's unmarked controls: the descriptors' parts are not yet marked under their keys in the scene).
- `control_room`: 50 rows. CR-MP9 shows "copy of plant_pool_03's mimic"; CR-MP3, 4, 5, 7, 8 their air plant, wet hall and boiler house boards; CR-MP1 works the Olympic's pumps, CR-MP7 BH-CP3. Flags: 3 unnamed, 6 unbound, 1 orphan (Control bus), 19 no maker, 53 missing controls.

## Follow-ups (in `TODO.md`)

- Mark 131's control parts under their keys in the scene so the missing-control flag clears.
- Doors and the "Equipment doors" read unclassified, not architectural: classify them (127's `object-class.ts`).
- Control-room copies with no board found (CR-MP1, CR-MP2, CR-MP6, CR-MP10): name their boards in `NAMED_COPIES` or the schematics.
- Name the Jacuzzi mimic and the plant-room lights in the scene.
