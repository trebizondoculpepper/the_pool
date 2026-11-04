# 158: One kind of room: the registry flags and the inventory

The owner, 2026-11-04. **The first of the one-kind-of-room missions (158–165), the most urgent work in the set, above the graphical ones (154–157), because it affects gameplay.** This brief also holds the decisions the whole series shares; 159–165 refer to it. Brief only; not started until the owner says. Read `CLAUDE.md`, `src/toolkit/controls/CLAUDE.md`, mission 147 (one object registry) and 130 (magic rooms).

## Why

Some rooms let the player work knobs and buttons and others don't; a chair seats you in one room and not the next; putting an object down works on some desks and not others. The owner wants one kind of room, and consistency of interaction above all:

- **Mouse over any object in any room and get its context** (what it is).
- **Click any chair and sit on it.**
- **Anything that can be picked up or put down works the same in every room.**

No room has different capabilities unless the owner explicitly says so. Development rooms and magic rooms are rooms too.

## One kind of room (the owner, 2026-11-04)

There is one kind of room. Every room, including the development rooms and the magic rooms (130), has the same capabilities unless the owner explicitly says otherwise, and any such exception is written in the room's definition with the owner's ruling.

A survey (2026-11-04, read-only) found why they differ today: `createFirstPerson` (`src/toolkit/controls/input/first-person.ts`) shares keys and motion, but each of 41 room builders supplies its own `use` callback with its own raycast and list. Eight builders ignore clicks (`use: () => {}`: shared-plant-layout, plant-fit, ceiling-lab, white-corridor, dry-stair, pipes-n-dreams, arched-rooms, donut-pool); the pool halls (`pool-hall-room.ts`) handle only a fixed list; the hover cue (`markUsable`/`usableOf`, `use-marking.ts`) is wired apart from the click, so a part can show a cue and do nothing. Seating works only in `shell-room` builds, inspect naming in five builders, pick-up (`objects`) in about half.

Every room therefore gets, from one room factory that `main.ts` calls when opening any room:

- **one click handler:** a click reaches whatever the cue finds, through the components' own registration (`markUsable`, `parts.uses`), so anything that shows a cue works when clicked; the per-room `use` lists go;
- **mouse-over context:** hovering any object shows what it is (its name, and its tag where it has one), from the same registration and the inspect rule (no peeking), in every room;
- **seating, pick-up, ladders and raised floors, the torch,** wherever the room holds the things they act on;
- later, the shared frame pipeline (154), which takes this factory as its foundation.

The 41 near-identical `createFirstPerson({...})` blocks become one call.

## Behaviour belongs to the object, not the room (the owner, 2026-11-04)

What a thing does when clicked, hovered or touched is decided by its kind, once, and is the same in every room it stands in. Three classes:

- **Never interactive:** pure decoration is never clickable and shows no cue, whatever room it is in; the procedural services ceiling (`src/toolkit/components/site-dressing/`) is the standing example, decorative from the beginning.
- **Always interactive in its own way:** every office chair is sittable, everywhere; the same holds for each kind with an obvious use (a door opens, a lamp switch switches).
- **Consistent physical behaviour:** box-like objects (desks, cabinets, boilers, tanks, the tops of panels) all behave the same when the player puts something on them: a held object is placed on any flat top surface it fits on, by the same rule (`object-handling.ts`, `placement-target.ts`), not by per-object or per-room code.

So each kind carries its interaction class and its affordances (sittable, a placing surface, usable controls, inspectable, decorative) in the one object registry (mission 147's `EQUIPMENT_KINDS`, `src/game/plant/equipment-kinds.ts`, and the descriptors in `src/game/descriptors/`), and the room factory applies them; a room never adds or removes one. An exception to a kind's behaviour is the owner's ruling, recorded on the kind. The plan lists every kind with its class, for the owner to check, and flags kinds that behave differently today (a chair that does not seat, a desk that refuses a placed object, decoration that shows a cue).

## The owner's decisions (2026-11-04)

1. **The object registry is the gateway.** Only a registered object has a name, context (the hover line), click actions, behaviour, solidity, a bench screen and a magic room. Anything unregistered (a bit of wall, a decorative pipe) is decoration and does nothing; that is fine and needs no work. So everything that should do something must be registered, in one consistent representation.
2. **Mouse-over context is the existing inspection line** (prompt 061, `src/toolkit/controls/logic/inspection.ts`), made universal: every registered object, in every room, is named when aimed at. `INSPECTED_ROOMS` (`src/toolkit/gallery/logic/inspected-rooms.ts`) and its per-room opt-in go.
3. **Carrying flags on the kind.** A kind may be **portable** (it can be picked up and put down); later a subset will also be **inventory**-able (flag reserved now, doing nothing yet). Fixed plant and furniture are not portable unless the kind says so.
4. **Solidity.** Registered kinds are **solid by default**; a kind may be flagged non-solid (many pipes can be walked through). The solid shape is **inferred from the object's bounding box** by default (a boxy thing is its box), a kind declaring a better shape only where the box fits badly. Solid tops support placed objects and, where the walker can reach them (a tank top up its ladder), the walker, as floor does; solid sides block, and an object can never be put into or through one. The room shell's walls and floors count as registered. The 1 m drop rule stands.
5. **Seats.** A kind may be a **seat**, with its seat height and a **default look direction**; a placed seat may override that with a target (a desk, a console, a workstation's screen; the BBC workstation's chair is the pattern). Clicking a seat sits you; seated you can look round and use what is in reach; moving or Esc gets you up. Every office chair is a seat.
6. **Experiment rooms get the standard room by default.** If one later needs something different, that becomes a named alternative **room style**, approved by the owner, never private room code.

## The series

| Mission | What                                          | Priority       | Needs       |
| ------- | --------------------------------------------- | -------------- | ----------- |
| 158     | Registry flags and the inventory (this brief) | Urgent         | —           |
| 159     | One room factory, behaviour unchanged         | Urgent         | 158 stage 1 |
| 160     | Hover context in every room                   | Urgent         | 159         |
| 161     | One click handler                             | Urgent         | 159         |
| 162     | Solidity and surfaces                         | High           | 158, 159    |
| 163     | Pick-up and put-down everywhere               | High           | 162         |
| 164     | Seats everywhere                              | Low            | 158, 159    |
| 165     | Enforcement                                   | After the rest | 160–164     |

Each mission is pushed, then reviewed by the designer (the coordinating agent) before its dependants start.

## This mission

1. **Registry flags (no behaviour change).** Add to each kind in the object registry (mission 147's `EQUIPMENT_KINDS`, `src/game/plant/equipment-kinds.ts`, and `src/game/descriptors/`): interaction class (decorative, usable, inspect-only), portable, inventory (reserved), solid (default true) and its shape (default: bounding box), surface (derived from solidity), seat (height, default look direction). Pure, typed, tested; every flag defaulted so nothing changes yet.
2. **The inventory, for the owner's sign-off.** A generated report (a script or a `?dev` page, recorded in `doc/agent-tooling.md`) listing (a) every kind with its proposed flags, and (b) every object in any room that has behaviour, a use, a cue, a seat, pick-up or collision today but is not registered, with what it does and which room builder wires it. The owner rules on the list; the agreed flags are written into the registry, and the unregistered behaving objects are registered or ruled decorative. Machinery and a report only, no whole-game playthroughs.

## Acceptance

- The flags exist on every kind, typed and defaulted, with tests; nothing changes for the player.
- The inventory report runs, is documented in `doc/agent-tooling.md`, and its list has been signed off by the owner; the agreed flags are in the registry.

## Coordination

Touches the object registry and descriptors: claim on the mailbox. Stage 1 unblocks 159.

## Records

A plan in `doc/plans/158-one-kind-of-room.md`; `TODO.md`; `CHANGELOG.md` under Unreleased once built; a diary entry.
