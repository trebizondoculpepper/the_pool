# 176 · completion rulings and remaining work

The owner's decisions from the finishing conversation (2026-11-04). Supersedes parts of `doc/plans/176-apply-traits.md`; the support-rule section of that plan is replaced by the first section here.

## Support rule (ruled)

A kind needs a `floor-standing`, `wall-mounted` or `ceiling-mounted` support **only if none of these apply**:

- its connection is `in-line` or `terminal` (its pipe/run holds it);
- its handling is `holdable` or `luggable` (the player carries/steers it);
- its form is `run-like` (it is the walk-through run itself — `pipework`, `plant-room`).

So the 21 remaining kinds (in-line valves, meters, sensors, `gas-train`, `pipework`, `plant-room`, and the handheld floppy-disk / software-box / spill-kit / water-test-kit) correctly name **no** support.

Implementation: a `needsSupport(primitives)` predicate in `src/game/plant/traits.ts`, used by `primitiveProblems(…, complete=true)`; the `support` facet's `words` in `FACET_RULES` explains the exemption.

## Enforcement (ruled)

Once `unclassified` is empty, switch on the rule that every registered kind must have at least one trait:

- `check` and the test suite fail for a kind with no `traits` (in `validateRegistry`).
- `register` requires `--traits` (a new option) and writes it into the file.

## `operable` redefinition (ruled)

`operable` means **an interactive control whose state change propagates to something else in the simulation** — a valve's lever (flow), a boiler's controls, a mimic's buttons, an annunciator's acknowledge/reset, a UV unit's on/off switch.

It does **not** mean a passive component or a door/drawer whose state changes but affects nothing. Consequences found so far:

- `heat-exchanger` — passive: `box-like, floor-standing, fixed`. Not operable, not readable.
- `sand-filter`, `cartridge-filter` — passive vessels; their state is defined by piped inputs, nothing settable: `cylindrical, floor-standing, fixed`.
- `uv-unit` — operable (its own on/off switch): `cylindrical, floor-standing, fixed, operable`.
- `filter-like` composite drops `operable`; `uv-unit` takes it alone.
- `desk` — passive floor-standing furniture: `box-like, floor-standing, fixed, supportable` (drop operable).
- `boiler` — operable. `boiler-cascade` — operable (contains operable boilers).
- mimics — always `readable`; `operable` where they carry buttons that drive the plant.
- annunciator — `operable` + `readable` (acknowledge/reset buttons).

## `readable` (ruled)

`readable` applies to things whose **primary purpose is to be read**. Labels on a machine do not by themselves make it readable.

## New traits (ruled, not yet implemented)

- **`openable`** — a covering/barrier that can be opened to access what is within; a local state (open/shut) that does not propagate into the plant simulation. Facet `use`; a kind may be both `openable` and `operable`.
- **`slidable`** — a thing with freedom of movement along a line (or spline), e.g. a drawer. A bare trait with an optional `slideAxis=x|y|z` hint; the exact path is the builder's concern. Slidability can be how a thing ends up openable (a drawer sliding out opens the compartment).

Both are defined **now as markers only**: they do not set the kind's interaction class (it stays `inspect-only`, as a thing with no click behaviour), and they carry no configuration yet. A later mission revisits each `slidable`/`openable` thing, gives it the configuration describing _how_ it slides or opens, and implements the behaviour. Until then the trait records that it is such a thing, nothing more.

## Named-object composites (ruled)

Composites are named **after the thing they describe**, not after an abstract family. So `desk` is its own composite (`box-like, floor-standing, supportable, fixed`), `mimic` its own, `safety-shower` its own, and the generic `office-furniture-like` is retired or kept only where a bundle genuinely means one thing. The trait of a desk can simply be `desk`.

## Storage cupboard (ruled, in progress)

- wall-mounted and floor-standing cupboards are **different kinds** (different types).
- a cupboard is a `container`, `openable` (doors) and `slidable` (its parts drawers), and `supportable` for a floor-standing one.
- drop `operable`.

## Records

Update `TODO.md`, `CHANGELOG.md`, `doc/agent-tooling.md` (support exemption + enforcement rule), and a diary entry. When the vocabulary additions (`openable`, `slidable`) are applied to kinds, add them to the trait files by command, not by hand.
