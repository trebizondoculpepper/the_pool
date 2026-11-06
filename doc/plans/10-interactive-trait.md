# 10 plan: the `interactive` trait — only interactive things are cued and clicked

Issue #10; the owner, 2026-11-06. Status: proposal for review. This plan sets the tier model, the gate in 161's resolver, and the mesh-index saving that makes the gate cheap. It lands in pieces (trait first, then the gate, then the index), each its own branch and PR (#8's resolver is the merge surface for the gate).

## The tier model (settled with the owner)

Three tiers, a ladder, not three flat buckets:

| Tier            | Trait                   | What it does                                                    | Gated                                           |
| --------------- | ----------------------- | --------------------------------------------------------------- | ----------------------------------------------- |
| **decorative**  | `decorative` (existing) | set-dressing: just looks; named by hover, no status, no context | nothing — not cued, not clickable               |
| **inspectable** | `inspectable` (new)     | read-only status/display + a hover / target-over context        | hover context (160), **not** cued or clicked    |
| **interactive** | `interactive` (new)     | inspectable **plus** it reacts to a use                         | all of inspectable's, plus cued + clicked (161) |

Owner rulings, 2026-11-06:

- **The tier is named `interactive`**, not "interactible".
- **All interactive things are inspectable** — `interactive` implies `inspectable` (the trait system already has `implies`).
- **"decorative" is the umbrella term for the lower two tiers**, _not_ "passive": passive has a specific meaning in this codebase (a component with no internal state that changes its role in the simulation). On the interaction ladder, everything below interactive is decorative; the middle rung is inspectable.
- **Inspectable is not a free default** — many things are pure set-dressing (office signs) and should not show a contextual status. A thing must be marked `inspectable` or `interactive` to be looked at with status; unmarked is decorative.

## Parts of a kind (option A: kind-level umbrella, parts opt out)

A registered machine like a jacuzzi cabinet is one kind (`jacuzzi-pack`) containing many **parts** — buttons (POWER, JETS, AIR, RESET), readouts, door latches, and decorative meshes (badge, body, louvres). Each part is built and registered individually (parts.uses / markUsable / markComponent). The owner chose option A:

- **The kind's tier is the umbrella/gate.** An `interactive` kind means its parts are handled as interactive by default.
- **Parts opt out by their own narrower mark**: a part marked decorative (`markComponent({decorative:true})`) or inspectable-only shows that, whatever its kind says.
- So the steel cabinet, badge, and a read-only display "just work" as passive by being an unmarked mesh, while the buttons and switches inherit interactivity from the machine. No 117-per-part audit entries needed.

Resolution walks up the hit mesh's parents to the nearest part/component mark, exactly as `useRegistrationOf` does today; the tier is read from that part's own mark (definitive), else its kind's trait (the umbrella).

## The gate, in 161's resolver

`resolve-aim.ts` (`resolveAim`) resolves a hit to its registration. The gate lands there:

1. **Passive things still occlude.** A valve is not clicked through a tank or a wall: passive meshes stay in the ray as occluders. The gate is on what a hit **may resolve to**, not on what the ray may hit.
2. **Early exit:** when no interactive thing's bounds lies within reach along the aim, skip the click/cue lookup and draw no cue.
3. **Carrying is the exception:** while something is carried, placement targets (supportable tops, bins, racks) are clickable though passive.
4. **The bigger saving is not the gate.** One aim lookup costs ~2 ms, nearly all of it walking the room's ~7,230 objects to find the ~7 meshes within reach (measured while closing #7, plant_pool_02). Keep a **mesh index** of the room (rebuilt when its contents change, as the derived surfaces are) instead of walking the scene each lookup, and share one lookup between hover (160) and click/cue (161). The interactive index makes the early exit cheap.

## What changes (the trait first)

**Step 1 — the trait (this PR's scope, self-contained and pure).**

- `traits.ts`: add `inspectable` (use facet, new) and `interactive` (use facet, new, `implies: ['inspectable']`). Make `operable`, `openable`, `holdable`, `sittable` imply `interactive` (the issue's rule).
- `equipment-kinds.ts`: `InteractionClass` becomes `decorative | inspectable | interactive` (replacing `decorative | inspect-only | usable`); `affordancesFromTraits` derives it from the traits (decorative → decorative; inspectable/interactive → what the ladder says; the existing `operable`/`sittable`/etc. now resolve to interactive via their implication).
- Update consumers of `InteractionClass` (`audit-data-section.ts`, `room-audit-page.ts`, the `equipment-kinds.test.ts` expectations).
- Kind audit via `npm run audit -- set <kind> traits+=…`: add `inspectable`/`interactive` where the current code already behaves so (work the places a kind today is `usable`/`inspect-only` through the audit or a test that checks the new resolve).

**Step 2 — the gate (separate branch, on #8's resolver).**

- In `resolveAim`, refuse to resolve a hit whose resolved registration is not interactive (option A umbrella + part opt-out), with the carrying exception.
- Early exit via the room's interactive bounds.

**Step 3 — the mesh index (separate branch).**

- A per-room mesh index (rebuilt on content change, as derived surfaces are), used by hover, cue and click. The measure: plant_pool_02 aim lookup under ~2 ms baseline.

## Acceptance (from the issue, condensed)

- Every registered kind is interactive, inspectable or decorative by its traits; a fast test checks a door, a holdable, a seat, an operable and a local-touchscreen kind are interactive, and a gauge, a tank and a pipe run are not clickable (inspectable or decorative).
- In plant_pool_02 a passive thing is never cued or clicked, things behind it still cannot be clicked, and the aim lookup costs measurably less than ~2 ms a call.

## What waits on what

- Step 1 (the trait) can start now.
- Steps 2–3 land with or after 161 step 2, now merged (`3308e64e`); #10's gate coordinates there.

## Records

`AGENTS.md` (every trait has a gameplay reason), `doc/agent-tooling.md` if an audit tool changes, `TODO.md`/`CHANGELOG.md`, a diary entry.
