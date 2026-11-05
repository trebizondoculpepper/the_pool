# 165: Enforcement

The owner, 2026-11-04. Part of the one-kind-of-room series (158–165); priority **after the rest**. Replanned 2026-11-05 (nicole_buruaah, at the owner's request) against what 159, 175, 176 and the owner's 2026-11-05 rules have since built. **Ready after 160, 161, 162 and 164**; its first step can start now.

**Needs:** 160, 161, 162, 164 (163, pick-up everywhere, is largely delivered by 189, 210 and 211, and its remainder is checked here).

## What it is

Tests that keep "one kind of room" true once it is built: every room is built by the factory and uses only the shared systems; the registry's invariants hold (decoration has no cue or use, every `sittable` kind seats, every `solid` kind has a shape, every holdable kind can be put down); and every deviation from regularity is a recorded one-off (the owner, 2026-11-05: a comment beginning `One-off (the owner, <date>):`). `doc/agent-tooling.md` describes the rules and how to add a kind or an exception.

## What exists already (checked 2026-11-05 at `74424dd1`)

- **The factory guard:** `gallery/logic/room-controller-coverage.test.ts` (159): no source under `gallery/rooms/`, `views/magic-room.ts` or `rendering/` imports or calls `createFirstPerson`; 41 starters, 42 factory calls; `main.ts` mounts through `roomControllerOn`.
- **The surfaces guard:** `gallery/logic/no-special-surface-rules.test.ts` (175): no marker mesh found by name, no named lookup, no room-private surface exception.
- **The registry's own tests:** `game/plant/equipment-kinds.test.ts`, `kind-files.test.ts`, `traits.test.ts`, `trait-index.test.ts` (typed kinds, traits and their facets).
- **The old inspection opt-in:** `inspected-rooms.slow.test.ts` (with `KNOWN_UNINSPECTED`) and `inspection-coverage.slow.test.ts` with its pin; 160 replaces the opt-in.
- **No one-off is marked yet:** no source has a `One-off (the owner, …)` comment.

## Approach

1. **Room-option guard (can start now):** extend `room-controller-coverage.test.ts` so that, as 160, 161, 162 and 164 land, no starter passes the options they retire (`inspect`, `use`, `aimed`, `useWhileHolding`, `heldAction`, `targetFeedback`, equipment `solids` and floors, seat wiring). Each retired option is added to the guard in the same push that retires it; until then the guard lists the starters still passing it, so the list can only shrink.
2. **Kind invariants, fast and pure:** export one validation of a kind's resolved traits and test it against every registered kind, with fixtures that break each rule: decorative kinds neither cue nor use; `sittable` kinds have a seat height and direction; `solid` kinds have a shape (declared or fitted); `holdable` kinds have a size that fits a top; `bin-like` kinds mark their inside. Fit and reachability are checked from geometry where the trait needs it, not a boolean alone.
3. **Scene coverage, slow:** use the existing room-audit infrastructure (not source scans) to prove each rendered registered object in each starter, the magic room included, is bound to a kind and gets its trait behaviour; keep it in the slow suite.
4. **One-offs recorded:** a fast test lists every `One-off (the owner, <date>):` comment with its file, so a reviewer sees them all; and the room-option guard accepts a remaining room hook only where such a comment stands beside it.
5. **Docs:** `doc/agent-tooling.md`'s "Rules for objects" says how to add a kind, how to add a trait's behaviour, and how a one-off is agreed and recorded.

## Risks

- "Every solid kind has a shape" can bless a shape that is too small or unreachable; validate geometry and fit, not just presence.
- Scene coverage is expensive; keep it slow and keep the invariant tests fast.
- A guard written before its mission lands would fail at once; add each rule with the push that makes it true.

## Open questions for the owner

None: only the owner's agreed one-offs (the 2026-11-05 rule) and approved room styles qualify as exceptions.

## Acceptance

- Fast tests reject a deliberately broken kind and a starter that passes a retired option; the room audit covers every starter, magic included, with no unrecorded bypass.
- Every one-off in the code carries its `One-off (the owner, <date>):` comment and is listed by the test.
- The full test suite passes; nothing changes that this brief does not name.

## Coordination

Touches tests and docs only (plus the one exported validation): claim on the mailbox. Each guard rule lands with, or after, the mission it enforces; coordinate with that mission's agent.

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased; `doc/agent-tooling.md`; a diary entry.
