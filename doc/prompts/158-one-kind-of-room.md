# 158: One kind of room: the registry flags and the registry census

The owner, 2026-11-04. **The first of the one-kind-of-room missions (158–165), the most urgent work in the set, above the graphical ones (154–157), because it affects gameplay.** This brief also holds the decisions the whole series shares; 159–165 refer to it. Brief only; not started until the owner says. Read `CLAUDE.md`, `src/toolkit/controls/CLAUDE.md`, mission 147 (one object registry) and 130 (magic rooms).

## Why

Some rooms let the player work knobs and buttons and others don't; a chair seats you in one room and not the next; putting an object down works on some desks and not others. The owner wants one kind of room, and consistency of interaction above all:

- **Mouse over any object in any room and get its context** (what it is).
- **Click any chair and sit on it.**
- **Anything that can be picked up or put down works the same in every room.**

No room has different capabilities unless the owner explicitly says so. Development rooms and magic rooms are rooms too.

## One kind of room (the owner, 2026-11-04)

There is one kind of room. Every room, including the development rooms and the magic rooms (130), has the same capabilities unless the owner explicitly says otherwise, and any such exception is written in the room's definition with the owner's ruling.

A survey (2026-11-04, read-only) found why they differ today: `createFirstPerson` (`src/toolkit/controls/input/first-person.ts:341`) shares keys and motion, but 42 direct calls in 41 starter files supply their own `use` callback; `lift-rooms.ts` has two calls. Eight starters ignore clicks (`use: () => {}`: `src/rendering/shared-plant-layout.ts:438`, `plant-fit-room.ts:334`, and six gallery starters); the pool halls (`pool-hall-room.ts:343-453`) handle only a fixed list; the hover cue (`markUsable`/`usableOf`, `use-marking.ts:36-53`) is wired apart from the click, so a part can show a cue and do nothing. Seating is declared by four view call sites but dispatched only in `shell-room.ts:546-550`; inspection is passed at seven controller sites, and `objects` at 20.

Every room therefore gets, from one room factory that `main.ts` calls when opening any room:

- **one click handler:** a click reaches whatever the cue finds, through the components' own registration (`markUsable`, `parts.uses`), so anything that shows a cue works when clicked; the per-room `use` lists go;
- **mouse-over context:** hovering any object shows what it is (its name, and its tag where it has one), from the same registration and the inspect rule (no peeking), in every room;
- **seating, pick-up, ladders and raised floors, the torch,** wherever the room holds the things they act on;
- later, the shared frame pipeline (154), which takes this factory as its foundation.

The 42 `createFirstPerson({...})` blocks become calls through one factory.

## Behaviour belongs to the object, not the room (the owner, 2026-11-04)

What a thing does when clicked, hovered or touched is decided by its kind, once, and is the same in every room it stands in. Three classes:

- **Never interactive:** pure decoration is never clickable and shows no cue, whatever room it is in; the procedural services ceiling (`src/toolkit/components/site-dressing/`) is the standing example, decorative from the beginning.
- **Always interactive in its own way:** every office chair is sittable, everywhere; the same holds for each kind with an obvious use (a door opens, a lamp switch switches).
- **Consistent physical behaviour:** box-like objects (desks, cabinets, boilers, tanks, the tops of panels) all behave the same when the player puts something on them: a held object is placed on any flat top surface it fits on, by the same rule (`object-handling.ts`, `placement-target.ts`), not by per-object or per-room code.

So each kind carries its interaction class and its affordances (sittable, a placing surface, usable controls, inspectable, decorative) in the one object registry (mission 147's `EQUIPMENT_KINDS`, `src/game/plant/equipment-kinds.ts`, and the descriptors in `src/game/descriptors/`), and the room factory applies them; a room never adds or removes one. An exception to a kind's behaviour is the owner's ruling, recorded on the kind. The plan lists every kind with its class, for the owner to check, and flags kinds that behave differently today (a chair that does not seat, a desk that refuses a placed object, decoration that shows a cue).

## The owner's decisions (2026-11-04)

1. **The object registry is the gateway.** Only a registered object has a name, context (the hover line), click actions, behaviour, solidity, a bench screen and a magic room. Anything unregistered (a bit of wall, a decorative pipe) is decoration and does nothing; that is fine and needs no work. So everything that should do something must be registered, in one consistent representation.
2. **Mouse-over context is the existing inspection line** (prompt 061, `src/toolkit/controls/logic/inspection.ts`), made universal: every registered object, in every room, is named when aimed at. `INSPECTED_ROOMS` (`src/toolkit/gallery/logic/inspected-rooms.ts`) and its per-room opt-in go.
3. **Carrying flags on the kind.** A kind may be **portable** (it can be picked up and put down); how things are carried (large items such as a 10 kg sack of bicarb, a player inventory) is a future design, not this series; nothing is reserved for it now. Fixed plant and furniture are not portable unless the kind says so.
4. **Solidity.** Registered kinds are **solid by default**; a kind may be flagged non-solid (many pipes can be walked through). The solid shape is **inferred from the object's bounding box** by default (a boxy thing is its box), a kind declaring a better shape only where the box fits badly. Solid tops support placed objects and, where the walker can reach them (a tank top up its ladder), the walker, as floor does; solid sides block, and an object can never be put into or through one. The room shell's walls and floors count as registered. The 1 m drop rule stands.
5. **Seats.** A kind may be a **seat**, with its seat height and a **default look direction**; a placed seat may override that with a target (a desk, a console, a workstation's screen; the BBC workstation's chair is the pattern). Clicking a seat sits you; seated you can look round and use what is in reach; moving or Esc gets you up. Every office chair is a seat.
6. **Experiment rooms get the standard room by default.** If one later needs something different, that becomes a named alternative **room style**, approved by the owner, never private room code.

## The series

| Mission | What                                                | Priority       | Needs       |
| ------- | --------------------------------------------------- | -------------- | ----------- |
| 158     | Registry flags and the registry census (this brief) | Urgent         | —           |
| 159     | One room factory, behaviour unchanged               | Urgent         | 158 stage 1 |
| 160     | Hover context in every room                         | Urgent         | 159         |
| 161     | One click handler                                   | Urgent         | 159         |
| 162     | Solidity and surfaces                               | High           | 158, 159    |
| 163     | Pick-up and put-down everywhere                     | High           | 162         |
| 164     | Seats everywhere                                    | Low            | 158, 159    |
| 165     | Enforcement                                         | After the rest | 160–164     |

Each mission is pushed, then reviewed by the designer (the coordinating agent) before its dependants start.

## This mission

1. **Registry flags (no behaviour change).** Add to each kind in the object registry (mission 147's `EQUIPMENT_KINDS`, `src/game/plant/equipment-kinds.ts`, and `src/game/descriptors/`): interaction class (decorative, usable, inspect-only), portable, solid (default true) and its shape (default: bounding box), surface (derived from solidity), seat (height, default look direction). Pure, typed, tested; every flag defaulted so nothing changes yet.
2. **The registry census, for the owner's sign-off.** A generated report (a script or a `?dev` page, recorded in `doc/agent-tooling.md`) listing (a) every kind with its proposed flags, and (b) every object in any room that has behaviour, a use, a cue, a seat, pick-up or collision today but is not registered, with what it does and which room builder wires it. The owner rules on the list; the agreed flags are written into the registry, and the unregistered behaving objects are registered or ruled decorative. Machinery and a report only, no whole-game playthroughs.

## Use the audit command (suggested, 2026-11-04)

Mission 167's command line gives each room's and kind's audit from the game's configuration alone, with no browser, dev server, scene or live simulation, in about 1.5 s: `npm run -s audit -- room <room>` (JSON), `kind <kind>`, `index`, `rooms`, `kinds`, and `--summary` for text. Pipe it to `jq` (`npm run -s audit -- room plant_pool_03 | jq '.findings'`). It is the same document as `audit/room/<room>.json` and the room audit page's **From data** section. Use it first, one room at a time, for the census's evidence and proposals; build a room in the browser (the page's **Verify this room**) only for what the data cannot vouch for (coverage `unknown`). See `doc/agent-tooling.md`, "Audit data and JSON".

## Findings

- `src/game/plant/equipment-kinds.ts:12-56,850-860` has classification (`plant`, `non-plant`, `decorative`) and status policy, but none of the proposed interaction, carrying, shape, surface or seat fields. `ObjectDescriptor` in `src/game/descriptors/descriptor.ts:93-113` stores a string kind and a separate class; `classOf` falls back for unknown kinds, so descriptors alone do not enforce registration. The descriptor registry is `src/game/descriptors/registry.ts:12-57`.
- Behaviour is attached to scene objects independently: `userData.usable` (`use-marking.ts:36`), `userData.portable` (`object-handling.ts:249-254`), `userData.placementTarget`/`placementSurface` (`object-handling.ts:328-341`), and `userData.seat` (`seating.ts:12-23`). The report must join these scene marks, descriptors, and all 42 starter sites; enumerating `EQUIPMENT_KINDS` alone misses chairs and trial equipment.
- Existing checks to extend: `src/game/descriptors/descriptors.test.ts`, `src/toolkit/controls/input/{use-marking,object-handling}.test.ts`, and the room/inspection audits in `src/toolkit/gallery/views/inspection-coverage.slow.test.ts`. No `equipment-kinds.test.ts` exists yet.

## Approach

1. Add a pure, typed affordance record and resolver to `equipment-kinds.ts`, keeping current `class` separate from the new interaction class. Default every new field explicitly and test default and override resolution without changing scene behaviour; this is stage 1 for 159.
2. Build a read-only registry census over kinds, descriptors and room starters, with stable room/kind/object refs and source of each observed cue, action, portable mark, seat and collision. Include unregistered behaving objects and a count of unresolved cases; document its command in `doc/agent-tooling.md` when implemented.
3. Put proposed values and discrepancies in `doc/plans/158-one-kind-of-room.md` for the owner's ruling. Apply the approved flags and register or explicitly rule on each behaving object in a follow-up push; do not infer owner decisions from today's inconsistent room wiring.

## Risks

- The existing `class` means plant status, while the new interaction class means behaviour; conflating them would make decorative and architectural descriptors ambiguous. Scene-only furniture and magic adapters (`src/toolkit/gallery/views/magic-adapters.ts:164`) require a registration path before later missions can enforce the gateway.

## Open questions for the owner

- Which proposed kind flags and unregistered behaving objects in the generated census are approved? This is the sign-off already required by this mission, not a new decision about the series.

## Acceptance

- A pure test enumerates every `KindId` and verifies the typed defaults and approved overrides; the stage-1 patch changes no controller behaviour.
- The documented report emits every kind and every unregistered object with cue, action, seat, portability or collision, grouped by starter and source; its unresolved count is zero after the owner's recorded sign-off and the agreed flags are in the registry.

## Coordination

Touches the object registry and descriptors: claim on the mailbox. Stage 1 unblocks 159.

## Records

A plan in `doc/plans/158-one-kind-of-room.md`; `TODO.md`; `CHANGELOG.md` under Unreleased once built; a diary entry.
