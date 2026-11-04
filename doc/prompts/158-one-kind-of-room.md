# 158: One kind of room: the same interaction everywhere

The owner, 2026-11-04. **The most urgent of the room and frame-rate missions, above the graphical ones (154–157), because it affects gameplay.** Brief only; not started until the owner says. Read `CLAUDE.md`, `src/toolkit/controls/CLAUDE.md`, mission 147 (one object registry) and 130 (magic rooms).

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

## Acceptance

- Every room, dev and magic rooms included, is built by the one room factory; a test walks the room registry and checks no room lacks a capability that is not an owner-ruled exception.
- In every room: hovering an object shows its context; a click reaches whatever shows a cue (no cue without a use, no use without a cue); every chair seats; a held object is put down on any flat top it fits on and picked up again.
- Each kind's interaction class and affordances live in the registry; a test checks that decoration has no cue or use, every chair kind seats, and every box-like kind with a flat top accepts a placed object by the shared rule.
- The plan's list of every kind with its class has been checked by the owner.
- The full test suite passes; a smoke run of a sample of rooms (a pool hall, a plant room, a corridor, dev0, a shared-plant-layout room, a magic room) confirms hover, click, sit and put-down by hand.

## Coordination

Touches `first-person.ts`, `object-handling.ts`, `use-marking.ts`, `seating.ts`, `main.ts`'s room opening and every room builder's `createFirstPerson` call: claim on the mailbox and migrate builders in batches others can see. 154 builds on its factory and follows it.

## Records

A plan in `doc/plans/158-one-kind-of-room.md`; `TODO.md`; `CHANGELOG.md` under Unreleased once built; `doc/agent-tooling.md` if the registry check is a tool; a diary entry.
