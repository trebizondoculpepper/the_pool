# 10 plan: the `interactive` trait — only interactive things are cued and clicked

Issue #10; the owner, 2026-11-06. Status: proposal for review. This plan sets the tier model, the gate in 161's resolver, and the mesh-index saving that makes the gate cheap. It lands in pieces (trait first, then the gate, then the index), each its own branch and PR (#8's resolver is the merge surface for the gate).

## The tier model (settled with the owner)

Three tiers, a ladder, not three flat buckets:

| Tier            | Trait                   | What it does                                                                              | Gated                                           |
| --------------- | ----------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------- |
| **decorative**  | `decorative` (existing) | set-dressing: just looks; named by hover, no status, no context                           | nothing — not cued, not clickable               |
| **functional**  | `functional` (new)      | does stuff — a real role in the world, nor interactive nor inspectable, no status readout | not cued, not clickable, no status              |
| **inspectable** | `inspectable` (new)     | read-only status/display + a hover / target-over context                                  | hover context (160), **not** cued or clicked    |
| **interactive** | `interactive` (new)     | inspectable **plus** it reacts to a use                                                   | all of inspectable's, plus cued + clicked (161) |

Owner rulings, 2026-11-06:

- **The tiers are `decorative`, `functional`, `inspectable`, `interactive`** — "interactible" was rejected for the top rung.
- **`functional` is a machine that is neither interactive nor inspectable but does stuff** — a ladder, a mobility aid: part of the world's function, climbed or used by the player's movement, yet no status to read and no use target (the owner, 2026-11-06).
- **All interactive things are inspectable** — `interactive` implies `inspectable` (the trait system already has `implies`).
- **"decorative" is the umbrella term for the lower tiers**, _not_ "passive": passive has a specific meaning in this codebase (a component with no internal state that changes its role in the simulation). On the interaction ladder, everything below interactive is decorative; inspectable and functional sit between.
- **Inspectable is not a free default** — many things are pure set-dressing (office signs) and should not show a contextual status. A thing must be marked `inspectable` or `interactive` to be looked at with status; `functional` for a role; unmarked is decorative.

## Parts of a kind (option A: kind-level umbrella, parts opt out)

A registered machine like a jacuzzi cabinet is one kind (`jacuzzi-pack`) containing many **parts** — buttons (POWER, JETS, AIR, RESET), readouts, door latches, and decorative meshes (badge, body, louvres). Each part is built and registered individually (parts.uses / markUsable / markComponent). The owner chose option A:

- **The kind's tier is permission; a part's usable mark is the target.** A click resolves only to a marked usable part, and only if its kind is interactive. Unmarked meshes are never targets whatever their kind — so the steel cabinet and badge are never clickable, and "opting out" is only needed for a _marked_ part that should not be clickable.

Resolution walks up the hit mesh's parents to the nearest part/component mark, exactly as `useRegistrationOf` does today; the tier is read from that part's own mark (definitive), else its kind's trait (the umbrella).

## The gate, in 161's resolver

`resolve-aim.ts` (`resolveAim`) resolves a hit to its registration. The gate lands there:

1. **Non-interactive things still occlude.** A valve is not clicked through a tank or a wall: non-interactive meshes stay in the ray as occluders. The gate is on what a hit **may resolve to**, not on what the ray may hit.
2. **Early exit:** when no interactive thing's bounds lies within reach along the aim, skip the click/cue lookup and draw no cue.
3. **Carrying is the exception:** while something is carried, placement targets (supportable tops, bins, racks) are clickable though non-interactive.
4. **The bigger saving is not the gate.** One aim lookup costs ~2 ms, nearly all of it walking the room's ~7,230 objects to find the ~7 meshes within reach (measured while closing #7, plant_pool_02). Keep a **mesh index** of the room (rebuilt when its contents change, as the derived surfaces are) instead of walking the scene each lookup, and share one lookup between hover (160) and click/cue (161). The interactive index makes the early exit cheap.

## What changes (the trait first)

**Step 1 — the trait (this PR's scope, self-contained and pure).**

- `traits.ts`: add `functional` (use facet, new), `inspectable` (use facet, new) and `interactive` (use facet, new, `implies: ['inspectable']`). Make `operable`, `openable`, `holdable`, `sittable` imply `interactive` (the issue's rule).
- `equipment-kinds.ts`: `InteractionClass` becomes `decorative | functional | inspectable | interactive` (replacing `decorative | inspect-only | usable`); `affordancesFromTraits` derives it from the traits (decorative → decorative; functional → functional; inspectable/interactive → what the ladder says; the existing `operable`/`sittable`/etc. now resolve to interactive via their implication).
- Update consumers of `InteractionClass` (`audit-data-section.ts`, `room-audit-page.ts`, the `equipment-kinds.test.ts` expectations).
- Kind audit via `npm run audit -- set <kind> traits+=…`: add `functional`/`inspectable`/`interactive` where the current code already behaves so (work the places a kind today is `usable`/`inspect-only` through the audit or a test that checks the new resolve). The first `functional` resident is a ladder's own kind where one is registered; unregistered world ladders are `functional` by their zone, not a kind tier.

**Step 2 — the gate (separate branch, on #8's resolver).**

- In `resolveAim`, refuse to resolve a hit whose resolved registration is not interactive (option A umbrella + part opt-out), with the carrying exception.
- Early exit via the room's interactive bounds.

**Step 3 — the mesh index (separate branch).**

- A per-room mesh index (rebuilt on content change, as derived surfaces are), used by hover, cue and click. The measure: plant_pool_02 aim lookup under ~2 ms baseline.

## Acceptance (from the issue, condensed)

- Every registered kind is interactive, inspectable, functional or decorative by its traits; a fast test checks a door, a holdable, a seat, an operable and a local-touchscreen kind are interactive, a ladder's kind is functional, and a gauge, a tank and a pipe run are not clickable (inspectable, functional or decorative).
- In plant_pool_02 a non-interactive thing is never cued or clicked, things behind it still cannot be clicked, and the aim lookup costs measurably less than ~2 ms a call.

## What waits on what

- Step 1 (the trait) can start now.
- Steps 2–3 land with or after 161 step 2, now merged (`3308e64e`); #10's gate coordinates there.

## Records

`AGENTS.md` (every trait has a gameplay reason), `doc/agent-tooling.md` if an audit tool changes, `TODO.md`/`CHANGELOG.md`, a diary entry.
