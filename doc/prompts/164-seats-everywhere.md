# 164: Seats everywhere

The owner, 2026-11-04. Part of the one-kind-of-room series (158–165); priority **low**. Replanned 2026-11-05 (nicole_buruaah, at the owner's request): it is now the room-wide half of the `sittable` trait (193), delivered through 161's one click handler. **Ready after 161's resolver**, with one question for the owner (below).

**Needs:** 159 (done) and **161's resolver** (sayuri_shantian, in progress): a seat is one more object that registers its own use. It **absorbs 193** (the `sittable` trait in code): do the two together.

## What it is

Sitting comes from the kind's `sittable` trait in every room, never from a room's wiring: every office chair, stool, bench and the bridge's chairs. Using a seat sits you at its `seatHeight`, looking its kind's `look` direction, or at the placed seat's own target where one is given (a desk, a console, the BBC workstation's screen); seated, you can look round and use what is in reach; moving gets you up.

## Findings (checked 2026-11-05 at `74424dd1`)

- **The trait exists, but no kind has it.** `sittable` is a primitive (use facet) in `src/game/plant/traits.ts` (about line 224) with `seatHeight` (default 0.45 m) and `look` meta; the composite `seat-like` (`traits/seat-like.ts`: box-like, floor-standing, sittable, luggable) exists. No registered kind carries either: there is no office-chair, stool or bridge-chair kind.
- **Seats are declared by their builders** (`controls/input/seating.ts`: `declareSeat`, `SeatDeclaration` on `userData.seat`, `seatOf` for the pose, pure maths in `controls/logic/seat.ts`): the engineer's chair (`site-dressing/views/engineers-desk.ts`, about line 693), the BBC workstation's (`industrial-control/views/bbc-workstation.ts`, 97) and the bridge's (`gallery/views/control-room-prototype.ts`, 1707 and 1733, with heights and look targets).
- **Only one room sits you down:** `gallery/rooms/shell-room.ts` (about line 547) turns a clicked declaration into `walk.sit(seatOf(chair, seat))`. The bridge's and the BBC room's chairs are declared but no click reaches them unless their room is a shell room.
- **Standing up:** `first-person.ts` stands the walker on movement (about lines 529, 1667, 1813). Escape frees the pointer and opens the menu (and lowers the phone, 213); it does not stand you up.

## Approach

1. **Register the seat kinds** with the audit command: an office chair, a stool or bench where one is placed, and the bridge's chair, each `seat-like` (or `sittable` alone where it is fixed), and bind their placements (`npm run -s audit -- bind <room> <thing> <kind>`). Each builder marks its seat's kind (`markEquipmentKind`).
2. **Sitting is the trait's use.** Through 161's registration, every object of a `sittable` kind registers a use that sits the walker at `seatHeight` looking `look`; a builder's `declareSeat` stays only as placement data (a seat's own `lookAt` target, a non-standard origin), read by the trait's use. The shell room's private seat branch goes.
3. **Test** sitting, looking round, using a nearby control while seated, and standing on movement, in the engineer's office, the BBC room and the bridge; and that a kind without the trait cannot be sat on.

## Risks

- `seatOf()` assumes a chair's origin at its foot and +z facing; differently modelled furniture needs its declaration's transform.
- A seated eye may be inside the chair's solid (162/208): collision must let the walker leave a seat.
- A luggable chair (seat-like is luggable) may be moved; the seat's pose must follow the chair, as `seatOf` reads it live.

## Open questions for the owner

- **Escape while seated:** Escape already frees the pointer and opens the menu. Should it also stand you up (one key doing two things), or should moving alone stand you up, as now? Recommendation: moving alone, leaving Escape to the menu. (193's own question, whether a chair lying on its side can be sat on, can wait: no chair can be knocked over yet.)

## Acceptance

- Every `sittable` kind seats through the factory in every room, including the bridge; the BBC workstation's chair faces its screen; movement stands the walker without disabling nearby controls.
- No room wires its own seating; `shell-room.ts`'s seat branch is gone.
- 193's acceptance is met (the behaviour for every kind with the trait, none without; `PRIMITIVES`' description and `doc/agent-tooling.md` updated).
- The full test suite passes; nothing changes that this brief does not name.

## Coordination

- Waits for 161's resolver (sayuri_shantian). Touches `seating.ts`, `shell-room.ts`, the three seat builders and the registry (by the audit command): claim on the mailbox.
- No `WORLD_VERSION` change.

## Records

`TODO.md` (tick 193 with it); `CHANGELOG.md` under Unreleased; `doc/agent-tooling.md`; a diary entry.
