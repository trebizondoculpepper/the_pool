# 161: One click handler

Tracked in #8; status lives there.

The owner, 2026-11-04. Part of the one-kind-of-room series (158–165); priority **urgent**. Replanned 2026-11-05 (nicole_buruaah, at the owner's request) against what missions 159, 189, 205, 209, 210 and 211 have since built; **ready to start**. Read `CLAUDE.md` (the rules "New behaviour goes into the game's systems, never a special case" and "Every deviation from regularity is justified and recorded") and mission 158 first, whose decisions (the registry as gateway, solidity, carrying flags, seats, room styles) this mission follows.

**Needs:** 159 (done, `cd4799d0`). **Lands after** 206/212's USE placement (below, Coordination).

## What it is

A click reaches whatever the cue finds, by one rule, the same in every room: the object under the aim says what a use does, through its own registration, and the room controller (`createRoomController`, mission 159) runs it. Today the hover cue already asks the object (`usableOf`), but the click goes to each room's own `use` callback, with its own raycast and its own lists, so the two can disagree and a room can miss things (the pool hall clicks only its spa and level panels). This mission makes cue and click come from the same object-owned registration and the same first visible hit, removes the rooms' `use` and `aimed` callbacks, and turns each room's special clicks into registered behaviour.

Decorative kinds never cue or use. The water room's ripple becomes a registered kind in that room (the water's own use), not the room's callback.

## The order a click is resolved in (from 209–211, kept)

Missions 209, 210 and 211 settled what a click does while carrying; the single resolver keeps that order exactly. **USE never drops or throws** (the owner, 2026-11-05); LET GO is its own action (Q, pad B, touch LET GO) and is not part of this resolver.

Not carrying:

1. **A ladder** to mount (the swim ladder from the water, or `ladderToUse`), as now.
2. **A lift**: a holdable thing under the aim, in reach, is picked up (possible or refused, mission 189; its owner may still say not now, `ownerAllows`).
3. **The object's own use**: the first visible hit's registered action (a switch, a knob turned by where it was hit, a door, a seat, the water's ripple).
4. Nothing: an inert or decorative thing, or nothing in reach, does nothing and shows no cue.

Carrying (the hands do nothing while the thing is on its way to the hand, 210, or held up to inspect, 117):

1. **Use while holding**: a control aimed at that takes the held thing (a fuse into its holder; parts marked `useWhileCarrying`), or a room's `useWhileHolding` today (the controls room, bin room and repair room), which this mission moves onto the objects. It comes first, as now: a control aimed at has first refusal over a place.
2. **A ladder** to mount, as when not carrying (211: a ladder can be climbed while carrying).
3. **A placement target** aimed at in reach (`userData.placementTarget`: a bin, 205/209; a rack, 206; a pile, 212): put in, or refused with the thing kept in hand.
4. **A clear spot on a supportable top** aimed at (put down there, eased, 210), or refused.
5. **The object's own use**, the held thing kept (a switch worked while carrying).

Cue and click must give the same answer at every step, for mouse, touch, keyboard and gamepad, with held repeat (`use-hold.ts`) unchanged.

## Findings (checked 2026-11-05 at `74424dd1`)

- **The click** (`src/toolkit/controls/input/first-person.ts`, `use`, about lines 389–458): a room's `useWhileHolding` first, then ladders, then `handling.use` (`object-handling.ts`'s `resolve(x, y).run()`), then the room's `options.use(x, y)`. This matches the order above; what moves is where use while holding is decided (the room's callback, to the objects).
- **The cue** (`first-person.ts`, `usableAt` and `probeCue`, about lines 640–720): its own raycast to the first visible mesh, `usableOf(first.object)`, then `handling.resolve` asked and never run, the room's `useWhileHoldingAt` as first refusal, and the room's `aimed()` to agree with a centre cue. So the cue and the click already share `handling.resolve`; what differs is the object's own use (cue from the object, click from the room).
- **The hands** (`src/toolkit/controls/input/object-handling.ts`, `resolve`, about line 788): held-and-inspecting or still moving does nothing; then `targetFeedback` (a room hook, `racks-room`, `shell-room`, `repair-room`); `useWhileCarrying` parts give way; `placementAt` (placement targets: bins now, racks and piles with 206/212); `spotOnTop` (210); then the room's `heldAction`. Not carrying: a lift. This is already one resolver for the hands, and this mission extends it rather than replacing it.
- **Object registration** (`src/toolkit/controls/input/use-marking.ts`): `markUsable(object, usable)` stores a pure `Usable` answer (`UseQuery` → `UseAnswer`) in `userData.usable`, read by `usableOf`, used in 5 source files. It is side-effect-free on purpose and has no action. Components with parts keep actions in `parts.uses` (`components/core/parts/parts.ts`, a `Map<Object3D, (direction?) => void>`), and the machines layer in `machines.useOf` (`gallery/views/room-equipment.ts`); `useOnHit` (`touch-point.ts`) turns a hit point into a knob direction.
- **The rooms**: 42 `createRoomController` call sites (in `src/rendering/` and `src/toolkit/gallery/rooms/`, plus `magic-room.ts`); every one passes `use`, and 34 pass `aimed`. Eight `use: () => {}` are empty: `rendering/shared-plant-layout.ts`, `rendering/plant-fit-room.ts`, and the gallery's `ceiling-lab-room`, `white-corridor-room`, `dry-stair-room`, `pipes-n-dreams-room`, `arched-rooms`, `donut-pool-room`. `useWhileHolding`/`useWhileHoldingAt`: `controls-room`, `bin-room`, `repair-room`. `heldAction`/`targetFeedback`: `racks-room`, `shell-room`, `repair-room`. `shell-room.ts` (about lines 719–834) combines parts, machines and seats in its own `usableAt`; `pool-hall-room.ts` (about line 497) uses only `useSpaPanel`; `water-room.ts` (about lines 342–364) owns the ripple.

## Approach

1. **One registration with a cue and an action.** Extend `markUsable` so a registration can carry, beside its pure `usable` answer, an action run on the same `UseQuery` (hit object, point, camera, pad), keeping the answer side-effect-free and asked separately. Adapt `parts.uses` and `machines.useOf` to register through it (one adapter each, not per room), with `useOnHit`'s hit-point direction preserved. Seats (`sittable`, 193) and the water's ripple register the same way.
2. **One resolver behind the factory.** In `first-person.ts`, the click and the cue take the same first visible hit (one raycast, one reach rule) and walk the order above: use while holding, ladders, then `handling.resolve`, then the hit object's registered action. `createRoomController` makes the rooms' `use` and `aimed` options unnecessary; keep them accepted, deprecated, while rooms migrate, and remove them at the end.
3. **Use while holding on the objects.** Move the three rooms' `useWhileHolding`/`useWhileHoldingAt` and the `heldAction`/`targetFeedback` hooks onto the objects they concern (a part marked `useWhileCarrying` with its action, or a placement target), so the hands' order is the only order. Where one cannot move (a behaviour that truly happens once in the game), it stays with a `One-off (the owner, <date>):` comment agreed with the owner.
4. **Migrate the 42 rooms in visible batches**: the eight empty callbacks first (deleted), then the rooms with one simple `usableAt`, then `shell-room`, `pool-hall-room` (all its equipment, not the spa and level panels alone), `water-room`, `controls-room`, `bin-room`, `repair-room`, `racks-room`, and `magic-room`. Announce each batch on the mailbox and push it on its own.
5. **A contract test.** Every registration with an action produces a cue, and every actionable cue resolves to the same target and action on click; a decoration neither cues nor acts; an occluding mesh stops the hit.

## Risks

- `markUsable` is deliberately side-effect-free; calling its answer as an action would be wrong. Keep answer and action apart in the registration.
- Some controls read the hit position (`useOnHit`, knob direction); the shared hit must pass the point through.
- Carrying gives `useWhileCarrying` parts first refusal over a placement (`object-handling.ts`'s `resolve`); keep that, and keep the cue's glyph matching.
- A room's `use` sometimes does more than the object (a help line, a sound, a state change in the room); find these as each room migrates and move them to the object's registration or the kind's builder, never into a new room hook.
- 206/212 are adding rack and pile placement to `object-handling.ts` now; rebasing onto them midway is the main merge risk (Coordination).

## Open questions for the owner

None. The order above is the owner's 209–211 rulings; the ripple's assignment was already in the original brief.

## Acceptance

- The factory resolves cue and click from the same object-owned hit, in the order above, for mouse, touch, keyboard and gamepad; tests cover a marked control, a parts-map control, a machine, a seat, carrying priority (placement target, top, use while holding, object use), a ladder while carrying, an occluding mesh and an inert decoration.
- No room passes `use` or `aimed`; the eight empty callbacks are gone; `useWhileHolding`, `heldAction` and `targetFeedback` are gone from the rooms, or each remaining one is a recorded one-off.
- The pool halls' equipment, not only their fixed list, works when clicked; the water room's ripple still works, as the water's registered use.
- The full test suite passes; nothing changes that this brief does not name.

## Coordination

- **Wait for 206/212's USE placement** (sayuri_shantian, claimed 2026-11-05): racks and piles are placement targets in `object-handling.ts`'s `resolve`/`placementAt`, landing first; 161 builds around them and does not re-implement them. Steps 1 and 2's design and the eight empty callbacks can start now; the hands' order (step 3) and the rooms with carrying hooks (`racks-room`, `shell-room`, `repair-room`) wait for that push.
- Touches `first-person.ts`, `object-handling.ts`, `use-marking.ts`, `parts.ts`, `room-equipment.ts`, `room-controller.ts` and every room builder's `use`: claim on the mailbox, keep out of files others hold (mission 214's phone work is in `first-person.ts`: farhad_taphrale, 2026-11-05), and migrate in batches others can see.
- No `WORLD_VERSION` change is expected.

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased; `src/toolkit/controls/AGENTS.md` (the controls contract changes); `doc/agent-tooling.md` where a tool changes; a diary entry.
