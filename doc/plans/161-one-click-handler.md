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

**Step 2's one resolver, first cut (2026-11-06, sayuri_shantian, reviewed by ahnaa_dmitrieva on #8; on branch `issue-8-one-click-handler`, PR pending):**

- `resolve-aim.ts`: the one first-visible-hit resolution (`resolveAim` + `aimCache`, one options object) owns the raycast and reach rule; both the cue (`usableAt`) and the click (`createFirstPerson`'s `use`) call it — no second copy of the ray. `clickOutcome` is the one pure gate (run / room / nothing).
- `use-marking.ts`: `useRegistrationOf` resolves a hit to its one registration — the nearest `usable`, and the action on that same object (never a separate walk), so cue and click can never pick different things; a child marked usable without an action never runs a parent's.
- The aim's coordinates, reach and pad come from one `useAimAt(free)` used by the cue and the click (free cursor → the cursor's point at 3 m; otherwise the centre at 4 m), so they agree even at the centre (review point 1 on #14).
- The click acts only where `clickOutcome` says run (the registration's own answer possible), and always casts fresh — never on a thing the cache saw move or be removed (review point 1, ahnaa_dmitrieva on #14). Where nothing is registered, the room's `use` still runs, accepted and deprecated. Note: "no room's click changes" holds only for things without a registered action; a thing that carries one now takes its own click, so step 4 must mark which rooms already changed (review point 4, nicole_buruaah on #14).
- Contract tests beside the resolver (`resolve-aim.test.ts`): actionable mark answers and resolves to the same target for the click, an occluder stops both, a decoration neither, the cache is shared (proved by moving the thing and casting fresh), and the click's gate runs / refuses / rooms. `use-marking.test.ts` grows `useRegistrationOf` cases.
- Pending: migrating the rooms' `use`/`aimed` (step 4), then the special rooms, after this resolver's review; #10's interactive gate slots into `resolveAim`.

**Pending:**

- Step 3 (use while holding on the objects) and the room-by-room migration (shell-room, pool-hall-room, water-room, controls-room, bin-room, repair-room, racks-room, magic-room).
- The records (`CHANGELOG.md`, `src/toolkit/controls/AGENTS.md`) when the contract ships; a diary entry.

## Progress (2026-11-07, nicole_buruaah; the owner reassigned #8 from sayuri_shantian)

PR #46 carries step 4's first batch (shell-room off its own walk) and the fixes its reviews asked for, rebased onto main after the phone missions (#75–#81):

- sayuri_shantian's uncommitted seat work, kept: the resolver keeps a hit with a null registration where nothing is marked, so a click on a declared seat sits the walker through one shared `sitDown` (`seatOfHit`, `seating.test.ts`).
- The phone's click path (#76) takes the resolver's `hit`/`uv` and its null registration (the merged tree did not typecheck otherwise).
- Registration order no longer decides the answer (the owner, 2026-11-06): `plainUsable` is the one plain answer; `registerPartUse` with it keeps an answer the object already has, and `markAnswer` (a part's cue, a knob's turn via `markTurnable`) sets an answer keeping the action. Tested in both orders, with a knob marked before its use.
- A room's part set registers the uses set on it directly (the engineer's desk, pipework valve chains, isolator handles, room services), which shell-room's removed walk used to reach through `machines.useOf`; deleting or disposing unregisters them. Checked in play: the engineer's chair seats, the PC's mouse opens its Open-Meteo window.
- The CM6 jog dial's cap pushes, its rim turns, and LB/RB turn it aimed at either (tests).
- Reach (the owner, 2026-11-06/07): a use may carry its own reach (`markReach`, metres from the eye to the point touched), honoured by the one resolution for the cue and the click; uses with none keep the aim's 3–4 m. The ~0.8 m direct-use default and the longer reaches it needs are #94.

Left: batches 2–8 of the inventory below (35 rooms), step 3's carrying hooks and #10's interactive gate. The first click after a shell room loads can still be taken by the pointer lock before it reaches the resolver (seen in the engineer's office).

## Step 4 inventory (checked 2026-11-06 at `02fbfa57`, branch `issue-8-one-click-handler`)

36 controllers still pass `use`/`aimed` (the deprecated fallback: `clickOutcome === 'room'` runs the room's own `use`). The resolver, registration and holding all exist on main; the migration is per-room: read the room's `use`, register its clicks on the objects (`markUsable` with an action), delete `use`/`aimed`. Batch order from the brief (biggest first):

1. **shell-room** (use=2, aimed=1) — the biggest, combines parts/machines/seats in one `usableAt`.
2. **pool-hall-room** (use=1) — the pool halls' equipment, not just the spa/level panels.
3. **water-room** (use=1, aimed=1) — the ripple as the water's registered use.
4. **controls-room** (aimed=1) — dev0's boards; useWhileHolding/At to the objects.
5. **bin-room, repair-room** (use=1 each) — their useWhileHolding/At to the objects.
6. **racks-room** (use=1) — heldAction/targetFeedback to the objects.
7. **magic-room** (use=2, aimed=1).
8. The remaining 29 simple rooms (most are one `usableAt` over the parts).
9. Step 3: the carrying hooks and the interactive gate (#10) in `resolveAim`.

Each batch: register the room's special clicks as object actions, delete the room's `use`/`aimed`, run the affected fast suites, commit and push; the draft PR (`issue-8-one-click-handler`) shows it all.
