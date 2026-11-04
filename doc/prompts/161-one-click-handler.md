# 161: One click handler

The owner, 2026-11-04. Part of the one-kind-of-room series (158–165); priority **urgent**. Brief only; not started until the owner says. Read `CLAUDE.md` and mission 158 first, whose decisions (the registry as gateway, solidity, carrying flags, seats, room styles) this mission follows.

**Needs:** 159 (160 may land in the same push).

## What it is

A click reaches whatever the cue finds, through the registry and the components' own registration (`markUsable`/`usableOf`, `use-marking.ts`; `parts.uses`). The per-room `use` lists and raycasts, and the eight empty `use: () => {}` (shared-plant-layout, plant-fit, ceiling-lab, white-corridor, dry-stair, pipes-n-dreams, arched-rooms, donut-pool), go. Decorative kinds never cue or use. A room's special click (the water room's ripple) becomes a registered kind in that room.

## Findings

- `src/toolkit/controls/input/first-person.ts:364-397` gives carrying and ladders first chance, then calls the starter's `options.use`; its cue probe at 550-657 separately uses `usableOf()` and `options.aimed`. `markUsable()` in `use-marking.ts:36-53` records a pure answer in `userData.usable`, not an action, so it cannot itself perform a click.
- There are 42 direct controller calls, each with `use`; eight empty callbacks are the two `src/rendering/{shared-plant-layout:438,plant-fit-room:334}.ts` and six gallery starters (`ceiling-lab`, `white-corridor`, `dry-stair`, `pipes-n-dreams`, `arched-rooms`, `donut-pool`). `pool-hall-room.ts:343-453` scans only spa/level panel use maps; `shell-room.ts:536-552` combines parts, machines and seats. `water-room.ts:355-364` owns the ripple click.
- Migrate the component action maps (`parts.uses`, `machines.useOf`) and room raycasts in all 42 sites. Update `use-marking.test.ts`, `first-person.test.ts`, and interaction tests such as `gallery/rooms/main-corridor-doors.test.ts`; keep the no-action cue tests in `controls/logic/use-cue.test.ts`.

## Approach

1. Define an object-owned use registration with both a cheap, pure cue query and an executable action on the same hit; adapt existing `parts.uses` and marked controls so cue and action resolve from one first visible hit, one reach rule and one ordering.
2. Put that resolver behind the factory and call it after the existing carry/ladder precedence. Migrate the 42 `use` callbacks and paired `aimed` callbacks in batches; represent the water ripple and seats as registered actions, and keep touch/gamepad and held-repeat semantics.
3. Remove the eight empty callbacks and add a fast contract that every actionable registration produces a cue and every actionable cue resolves to the same target on click. Check pool equipment beyond the old two-panel list.

## Risks

- `markUsable` is deliberately side-effect-free; calling its answer as an action would be wrong. Some controls use `useOnHit` to interpret hit position, and carrying can give controls first refusal (`first-person.ts:622-625`); keep both paths equivalent.

## Open questions for the owner

None; the water ripple is already explicitly assigned a registered kind in this brief.

## Acceptance

- The factory resolves cue and click from the same object-owned hit for mouse, touch, keyboard and gamepad; tests cover a marked control, a legacy parts-map control, carrying priority, an occluding mesh and an inert decoration.
- The pool halls' equipment, not only their fixed list, works when clicked.
- The full test suite passes; nothing changes that this brief does not name.

## Coordination

Touches `first-person.ts`, `use-marking.ts` and every room builder's `use`: claim on the mailbox and migrate in batches others can see.

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased; `doc/agent-tooling.md` where a tool changes; a diary entry.
