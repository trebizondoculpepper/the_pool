# 10 plan: the `interactive` trait — only interactive things are cued and clicked

Issue #10; the owner, 2026-11-06. Status: proposal for review (revised after two reviews on the PR). This plan sets the interaction model, the gate in 161's resolver, and the mesh-index saving that makes the gate cheap. It lands in pieces — the trait, the index, then the gate (the reviewers agreed index-before-gate) — each its own branch and PR (#8's resolver is the merge surface for the gate).

## The interaction model (settled with the owner; precedence, not a ladder)

Five classes. They are resolved by **precedence**, not built as a strict ladder: only `interactive ⇒ inspectable` is a true implication; `functional`, `readable` and `inspectable` are **siblings** and may coexist (a lift is functional — you ride it — and inspectable — its floor display; a mimic is readable — its labels — and inspectable — its lamps).

| Class           | Trait                   | What it is                                                                                                                                                               | Gated                                                                                                               |
| --------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| **decorative**  | `decorative` (existing) | truly inert, seen and nothing else (the trait already rejects pairing with a use facet)                                                                                  | never cued, never clicked                                                                                           |
| **functional**  | `functional` (new)      | does stuff — a real role in the world (a ladder, a mobility aid), neither interactive nor inspectable                                                                    | not cued or clicked as a control; but the hands' and ladder resolvers still act on it (161's order reaches ladders) |
| **readable**    | `readable` (existing)   | its read-out is **constant**: a sign, a book, a plate always say the same thing, whatever the object's condition                                                         | hover shows its text / target-over, **not** cued or clicked                                                         |
| **inspectable** | `inspectable` (new)     | its read-out **reflects its internal state** — a gauge's needle with the pressure, a display's live value, a tank's level; what you glean changes with the thing's state | hover context (160) / target-over, **not** cued or clicked                                                          |
| **interactive** | `interactive` (new)     | inspectable **and** reacts to a use                                                                                                                                      | all of inspectable's, plus cued + clicked (161)                                                                     |

The key distinction between `readable` and `inspectable` (the owner, 2026-11-06): a readable thing always says the same thing; an inspectable thing's read-out is affected by its internal state or condition. They can coexist on one object (a mimic's labels are readable, its lamps inspectable).

Precedence when classes overlap: **interactive > inspectable > readable > functional > decorative**. "Non-interactive" is the umbrella term for everything below interactive. **`interactive` implies `inspectable`** — the only implication; `interactive` does **not** imply `readable` (a button is operated, not read).

Owner rulings, 2026-11-06:

- The top tier is **`interactive`**, not "interactible".
- **`functional` is a machine that is neither interactive nor inspectable but does stuff** — a ladder, a mobility aid: part of the world's function, climbed or used by the player's movement, yet no status to read and no use target.
- **`readable` is its own class, constant content** — not a shadow of `inspectable`; a sign always says the same thing, an inspectable readout changes with state.
- **"decorative" is reserved for truly inert things**, _not_ used as an umbrella; the umbrella is **non-interactive**. (`decorative` as a class is derived for unmarked kinds; `decorative` as a trait is explicit and excludes any use facet.)
- **`passive` is avoided** for the umbrella: it has a specific meaning in this codebase (a component with no internal state that changes its role in the simulation).
- **Inspectable is not a free default** for kind-only naming — but see the hover effect below.

**Open for the owner (one item left; `readable` is settled):**

- **`readable` is kept as its own class** (constant content); the composites whose readouts are state-driven (`instrument-like`, `mimic`, `board-like`) gain `inspectable` explicitly. `sign` stays readable where its words matter — its hover shows the text, no status; a set-dressing poster stays decorative.
- **`functional`'s gameplay (settled 2026-11-06): a `ladder` trait.** A new composite trait `ladder` **extends `functional`** and defines the ladder behaviour (climbing, the mobility aid) — elsewhere, mounts and lets the player climb. It gives `functional` a concrete job and is written through it, so a ladder kind resolves functional not by hand but by carrying `ladder`. Whether other things (stairs, a lift) gain their own `functional`-extending traits is a later decision; step 1 represents `functional` and the `ladder` trait.

## Hover effect of "inspectable is not a default"

Checked against `inspect-pick.ts`: the plant's identity-marked machines (a `markComponent` with a tag) are named with live status from `inspectComponent` **before** kind is looked at, so the tiers do **not** change those. Only **kind-only** things (160's kind naming, where nothing has an identity mark) change. So the step-1 behaviour change is limited to kind-only things: unmarked they lose their name unless `inspectable`. The table says a decorative thing is still _named_ by hover (its kind's name), so one option is to keep that naming (no hover change in step 1) and gate only cue/click.

## Parts of a kind (option A: kind-level permission, part is the target)

A registered machine like a jacuzzi cabinet is one kind (`jacuzzi-pack`) containing many **parts** — buttons (POWER, JETS, AIR, RESET), readouts, door latches, and decorative meshes (badge, body, louvres). Each part is built and registered individually (parts.uses / markUsable / markComponent). The owner chose option A:

- **The kind's class is permission; a part's usable mark is the target.** A click resolves only to a marked usable part, and only if its kind is interactive. Unmarked meshes are never targets whatever their kind — so the steel cabinet and badge are never clickable, and "opting out" is only needed for a _marked_ part that should not be clickable.

Resolution walks up the hit mesh's parents to the nearest part/component mark, exactly as `useRegistrationOf` does today; the class is read from that part's own mark (definitive), else its kind's class (derived from the kind's traits).

## The gate, in 161's resolver (step 2)

`resolve-aim.ts` (`resolveAim`) resolves a hit to its registration. The gate lands there:

1. **Non-interactive things still occlude.** A valve is not clicked through a tank or a wall: non-interactive meshes stay in the ray as occluders. The gate is on what a hit **may resolve to**, not on what the ray may hit.
2. **Ladder and carried-item handlers run first.** 161's click order (mount a ladder; use while carrying; placement targets) is reached before the registered-action gate, so a `functional` ladder is still climbable and carrying still works — the gate is not read as refusing them.
3. **Early exit** via the room's interactive bounds — but only once step 3's index exists; until then step 2 is purely the correctness gate (refuse non-interactive resolutions) with no performance promise.
4. **Coverage test as a prerequisite.** Before the gate lands, a test lists every usable mark whose owning kind is not interactive (or has no kind). It must be empty, or those things registered, or the gate falls back to today's behaviour for unregistered owners until 165.
5. **The bigger saving is the mesh index (step 3),** not the gate — one aim lookup costs ~2 ms, nearly all of it walking the room's ~7,230 objects to find the ~7 meshes in reach (measured while closing #7, plant_pool_02). A per-room mesh index (rebuilt when contents change, as derived surfaces are; live world-space bounds rechecked each query so moved doors/carried items/panels invalidate correctly; not just add/remove) is shared by hover, cue and click. Benchmark hover and cue/click together in plant_pool_02.

## What changes (trait first, then index, then gate)

**Step 1 — the trait (this PR's eventual scope, self-contained and pure).**

- `traits.ts`: add `functional` (use facet, new), `inspectable` (use facet, new) and `interactive` (use facet, new, `implies: ['inspectable']`). Make `operable`, `openable`, `holdable`, `sittable` imply `interactive` (the issue's rule). Add the composite trait **`ladder`** extending `functional`, which defines the ladder behaviour (climbing; the mobility aid) and is the first concrete use of `functional`.
- `equipment-kinds.ts`: `InteractionClass` becomes `decorative | functional | readable | inspectable | interactive` (replacing `decorative | inspect-only | usable`); `affordancesFromTraits` derives the class by precedence (interactive > inspectable > readable > functional > decorative) from the traits; the existing `operable`/`sittable`/etc. now resolve to interactive via their implication; `readable` stays a class of its own (constant content).
- Update consumers of `InteractionClass` (`audit-data-section.ts`, `room-audit-page.ts`, the `equipment-kinds.test.ts` expectations) and grep string literals (`usable`, `inspect-only`) beyond those three, including audit JSON snapshots.
- Migrate explicit `affordances.interaction` values through the audit command (`sign.ts` sets `'inspect-only'`), map the kind-class fallback (`resolveKindAffordances`: `decorative` → decorative, else the new default), and reconcile the class-vs-trait `decorative` distinction (class derived for unmarked kinds; trait explicit and never added to every unmarked kind).
- The composites whose readouts are state-driven gain `inspectable` explicitly: `instrument-like` (10 files), `mimic` (12), `board-like` (8) — through the audit command. `readable` stays on the constant-content kinds that keep it.
- A fast classification test: a door, a holdable, a seat, an operable and a local-touchscreen kind are interactive; a ladder's kind is functional (through its `ladder` trait); a sign (or book) is readable; a gauge, a tank and a pipe run are not clickable.
- Reclassifying the existing kinds onto the new traits (`inspectable` on the state-driven composites, `functional`/`ladder` on ladders and stairs, decorative for true set-dressing) is a separate ticket, raised when step 1 lands — see "What waits on what".

**Step 3 — the mesh index (separate branch, before the gate).**

- A per-room mesh index (rebuilt on content change; live bounds rechecked per query), shared by hover, cue and click; preserving first-hit occlusion. The measure: plant_pool_02 aim lookup under the ~2 ms baseline, hover and cue/click together.

**Step 2 — the gate (separate branch, on #8's resolver).**

- In `resolveAim`, refuse to resolve a hit whose resolved registration is not interactive (option A permission + part target), with the carrying exception and after the ladder steps; prereq the coverage test above.

## Acceptance (from the issue, condensed)

- Every registered kind is interactive, inspectable, functional or decorative by its traits; a fast test checks a door, a holdable, a seat, an operable and a local-touchscreen kind are interactive, a ladder's kind is functional, and a gauge, a tank and a pipe run are not clickable.
- In plant_pool_02 a non-interactive thing is never cued or clicked, things behind it still cannot be clicked, and the aim lookup costs measurably less than ~2 ms a call.

## What waits on what

- Step 1 (the trait + the `ladder` composite) can start now — `readable` and `functional` are both settled.
- Reclassifying the existing kinds onto the new traits is a **separate ticket** (raised 2026-11-06): a sweep that marks each kind's true class once the traits exist.
- Step 3 (the index) is independent of both and has the biggest payoff; do it before the gate.
- Step 2 (the gate) lands on #8's resolver, now merged (`3308e64e`), gated by the coverage test.

## Records

`AGENTS.md` (every trait has a gameplay reason), `doc/agent-tooling.md` if an audit tool changes, `TODO.md`/`CHANGELOG.md`, a diary entry.
