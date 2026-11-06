# 160: Hover context in every room

Tracked in #7; status lives there.

The owner, 2026-11-04. Part of the one-kind-of-room series (158–165); priority **urgent**. Replanned 2026-11-05 (nicole_buruaah, at the owner's request) against what missions 159, 161, 169, 176 and the trait missions have since built; **ready to start**. Read `CLAUDE.md` ("Every object is a registered kind", "New behaviour goes into the game's systems, never a special case") and mission 158 first.

**Needs:** 159 (done, `cd4799d0`). **Works beside** 161 (sayuri_shantian, in progress): both ask "what is the first visible thing under the aim", so they share one hit.

## What it is

Hovering over a thing names it, the same in every room: the room factory (`createRoomController`) installs the inspection line (prompt 061) for every room, so every lookable object, in every room, is named when aimed at (its name, its tag where it has one, its live state on the second line; the no-peeking rule stands). Things with no identity and no registered kind stay silent and still block the aim. `INSPECTED_ROOMS` and its per-room opt-in go, and the main corridor's known gap closes.

## Findings (checked 2026-11-05 at `74424dd1`)

- **Where it is wired today:** `first-person.ts`'s `inspect` option (about line 293) is called only when a room passes one. Seven room starters pass `inspect: createInspector({...})`: `gallery/rooms/shell-room.ts` (about line 821), `plant-room-shell-room.ts` (429), `plant-room.ts` (758, gated to `dev51` by its own `INSPECTED` set at line 98), `controls-room.ts` (595), `museum-hall-room.ts` (356), `tank-hall-room.ts` (210) and `co2-cage-room.ts` (408). The other 35 of the 42 controllers have no hover naming; the main corridor, the pool halls, the dev rooms and the magic room among them.
- **The inspector** (`gallery/views/inspect-pick.ts`, `createInspector`): first visible hit within `INSPECT_REACH_METRES`, nearby meshes only (each mesh's bounds entered within reach, warmed in idle time: a full-scene raycast costs about 11 ms in the Olympic plant room), the nearest marked owner up the parents (`owningComponent`, `components/core/views/component-identity.ts`), a room's optional `identify` (dev0's controls), and `inspectComponent` (`game/plant/component-inspection.ts`) for the lines, with a world reader for live state.
- **Two marks, not yet joined:** what the inspector names is a _component identity_ (`markComponent`: tag, name, model binding, part, `decorative`, `architectural`, `fabric`), set in about 71 source files. What the registry knows is a _kind_ (`markEquipmentKind`, `userData.equipmentKind`), set on placed shell-room equipment by `room-equipment.ts` and by a few builders (desk things, carton, skip, dustbin, pool water, spa). Kinds carry `type` (their name) and their room bindings (`bindings: [{room, thing}]`). An object with a kind but no identity is unnamed today; an object with an identity is named whether or not its kind is registered.
- **The opt-in list:** `gallery/logic/inspected-rooms.ts` (`INSPECTED_ROOMS`), guarded by `inspected-rooms.slow.test.ts` with `KNOWN_UNINSPECTED` (the main corridor); `gallery/views/inspection-coverage.slow.test.ts` and `inspection-coverage.json` pin today's coverage.
- **161 overlap:** the click's cue (`usableAt` in `first-person.ts`) casts its own ray to the first visible mesh; 161 is making click and cue share one hit. The inspector's ray is a third. They differ in reach (cue: centre or cursor reach; inspector: 3 m) but not in what blocks.

## Approach

1. **The factory wires it.** `createRoomController` builds one inspector for every room from what it already has (`scene`, `camera`, `metre`), plus two optional room inputs kept as data, not behaviour: `world` (the live-state reader) and `identify` (dev0's adapter, until dev0's controls are marked). Rooms stop passing `inspect`; the seven sites and `plant-room.ts`'s `INSPECTED` gate go.
2. **Name from identity, then kind.** In `createInspector`, the nearest owner's identity wins as now; where a hit's owner has no identity but has a registered kind (`equipmentKindOf` up its parents), it is named by the kind's `type` (and the binding's thing as its tag, where the registry gives one). Unregistered, unidentified things stay silent and still block. Nothing is revealed that the no-peeking rule hides (closed cabinets, model-only status).
3. **Share the hit with 161.** Use the same first-visible-hit rule (and, once 161's resolver lands, the same cached hit where reach allows) so what is named, what is cued and what a click reaches cannot disagree about what is in front. Keep the inspector's nearby-mesh filter and idle warming: no naïve full-scene raycast.
4. **Replace the opt-in with a contract.** Remove `INSPECTED_ROOMS` and `KNOWN_UNINSPECTED`; a fast test checks that no room starter passes `inspect` and that the factory always installs it. Update the slow coverage audit and its pin for the intended rise in coverage; test occlusion, name and tag, a kind-only object named by its type, and live detail.

## Risks

- Cost in big rooms: the factory must keep `createInspector`'s nearby filter and warming; check frame time in the Olympic plant room and a pool hall.
- Rooms that had no inspector may hold identities that read badly or not at all; the coverage audit will show them, to be fixed by their builders, not by room exceptions.
- 161 is changing `first-person.ts`'s cue path now; farhad_taphrale's 214 is also in `first-person.ts`. Agree the order before touching it.

## Open questions for the owner

None: the registry gateway and the no-peeking rule settle what is named. (Whether an object with an identity but no registered kind should fall silent is 165's enforcement, not this mission's.)

## Acceptance

- Hovering a registered or identified object names it in a pool hall, a plant room, the main corridor, dev0 and a magic room; an object with only a kind mark is named by its kind's type.
- No room starter passes `inspect`; `INSPECTED_ROOMS`, `KNOWN_UNINSPECTED` and the `dev51` gate are gone; a hidden object behind an opaque first hit stays unnamed.
- Frame time in the Olympic plant room is no worse than today with the inspector on.
- The full test suite passes; nothing changes that this brief does not name.

## Coordination

- Touches `room-controller.ts`, `inspect-pick.ts`, `inspection.ts`, `inspected-rooms.ts` and its tests, and the seven starters: claim on the mailbox. `room-controller.ts` is held by sayuri_shantian for 161 (2026-11-05): agree the change with them, or land after their resolver.
- No `WORLD_VERSION` change.

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased; `doc/agent-tooling.md` (the inspection overlay is now everywhere; the opt-in list is gone); a diary entry.
