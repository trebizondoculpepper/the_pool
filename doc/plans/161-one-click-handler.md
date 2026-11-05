# 161 — One click handler: plan and progress

Brief: `doc/prompts/161-one-click-handler.md`. The owner, 2026-11-04, urgent, [ready]; replanned 2026-11-05 against 189, 205, 209–211. A click reaches whatever the cue finds, by one rule: the object under the aim says what a use does through its own registration, and the room controller runs it. Cue and click come from the same object-owned registration and the same first visible hit; the rooms' `use`/`aimed` callbacks go.

## Approach (the brief's; kept)

1. **One registration with a cue and an action**: `markUsable` carries, beside the pure `usable` answer, an action run on the same `UseQuery`. `parts.uses` and `machines.useOf` adapt through it, as do seats and the water's ripple.
2. **One resolver behind the factory**: in `first-person.ts`, click and cue take the same first visible hit and walk the order (use while holding, ladders, handling.resolve, the hit object's registered action). `createRoomController` makes `use`/`aimed` unnecessary; kept accepted while rooms migrate.
3. **Use while holding on the objects** — waits on 206/212's USE placement (which I am doing) and farhad's `first-person.ts`.
4. **Migrate the 42 rooms in visible batches**, announce each and push on its own.
5. **A contract test**: actionable registration → a cue; actionable cue → same target and action on click; decoration neither; occluders stop the hit.

## Progress (2026-11-05, sayuri_shantian; mission incomplete)

**Batch 1 (done, this commit):**

- `use-marking.ts`: `markUsable(object, usable, action?)` stores a separate `UseAction` beside the side-effect-free `Usable`; `useActionOf(object)` finds the action on the same walk as `usableOf`. Contract test (`use-marking.test.ts`): answer and action apart; ancestor lookup; unmark clears both; an actionable registration always answers, decoration neither.
- The eight empty `use: () => {}` room callbacks removed: `shared-plant-layout`, `plant-fit-room`, `ceiling-lab-room`, `white-corridor-room`, `dry-stair-room`, `pipes-n-dreams-room`, `arched-rooms`, `donut-pool-room`.
- TODO.md: 161 marked **Incomplete**, this progress recorded.

**Pending:**

- Step 2's resolver in `first-person.ts` (one first-visible-hit click and cue; the hit object's registered action), coordinated with farhad_taphrale (mission 214 holds `first-person.ts`) and after 206/212's placement lands.
- Step 3 (use while holding on the objects) and the room-by-room migration (shell-room, pool-hall-room, water-room, controls-room, bin-room, repair-room, racks-room, magic-room).
- The records (`CHANGELOG.md`, `src/toolkit/controls/AGENTS.md`) when the contract ships; a diary entry.
