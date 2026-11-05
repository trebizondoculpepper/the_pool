# 176 · completion rulings and remaining work

The owner's decisions from the finishing conversation (2026-11-04). Supersedes parts of `doc/plans/176-apply-traits.md`; the support-rule section of that plan is replaced by the first section here.

## Support = what holds its weight (ruled)

`support` names what actually holds the kind's weight. A floor cabinet placed with its back near (or against) a wall is `floor-standing`: the nearness to the wall is placement, not a second support. (The Dr Aqualis Trio: floor-standing, backed 0.05 m off its wall.)

## Support rule (ruled)

A kind needs a `floor-standing`, `wall-mounted` or `ceiling-mounted` support **only if none of these apply**:

- its connection is `in-line` or `terminal` (its pipe/run holds it);
- its handling is `holdable` or `luggable` (the player carries/steers it);
- its form is `run-like` (it is the walk-through run itself — `pipework`, `plant-room`).

So the 21 remaining kinds (in-line valves, meters, sensors, `gas-train`, `pipework`, `plant-room`, and the handheld floppy-disk / software-box / spill-kit / water-test-kit) correctly name **no** support.

Implementation: a `needsSupport(primitives)` predicate in `src/game/plant/traits.ts`, used by `primitiveProblems(…, complete=true)`; the `support` facet's `words` in `FACET_RULES` explains the exemption.

Mission 202 adds a narrow architectural-volume case: a form-less `water-body` basin is a void in the room, so it needs no mounting trait; a formed tub such as the Jacuzzi still names its floor support. This is the mission 202 implementation interpretation of the owner's new water-body request (2026-11-05).

## Enforcement (ruled)

Once `unclassified` is empty, switch on the rule that every registered kind must have at least one trait:

- `check` and the test suite fail for a kind with no `traits` (in `validateRegistry`).
- `register` requires `--traits` (a new option) and writes it into the file.

## `operable` redefinition (ruled)

`operable` means **an interactive control whose action changes something else in the simulation** — a valve's lever (flow), a boiler's controls, a pump starter, a UV unit's on/off switch.

It does **not** mean a passive component or a door/drawer whose state changes but affects nothing. The precise test: **`operable` = a control whose action changes something else in the simulation.** A button that changes only the unit's own display/lamp — a flowmeter's mode button, an annunciator's acknowledge or lamp-test — is _not_ operable, however much the unit itself changes; adjusting a valve is operable because it changes the flow. Consequences found so far:

- `heat-exchanger` — passive: `box-like, floor-standing, fixed`. Not operable, not readable.
- `sand-filter`, `cartridge-filter` — passive vessels; their state is defined by piped inputs, nothing settable: `cylindrical, floor-standing, fixed`.
- `uv-unit` — operable (its own on/off switch): `cylindrical, floor-standing, fixed, operable`.
- `filter-like` composite drops `operable`; `uv-unit` takes it alone.
- `desk` — passive floor-standing furniture: `box-like, floor-standing, fixed, supportable` (drop operable).
- `boiler` — operable. `boiler-cascade` — operable (contains operable boilers).
- `alarm-printer` — prints the record of what happened; nothing it does changes the plant: `box-like, floor-standing, fixed, readable` (drop operable).
- pure mimics — **display only** (`readable`), no plant-driving buttons.
- annunciator — `readable`, not `operable`: acknowledging an alarm changes only its own lamps, nothing in the plant.

## A panel inherits its components' traits (ruled)

A control panel's traits are the **union of what it contains**: `readable` for its display or mimic, `operable` for the buttons that drive the plant, `openable` for a cupboard-like door, `container` if it holds other objects, and its own form and support. So the PL1 pump controller (`pump-panel`) = `box-like, floor-standing, fixed, readable, operable, openable`.

## `container` (ruled)

`container` means the kind can potentially contain **other game objects**, not that it holds a stuff-like material. A sand filter is not a container: it holds sand, but sand grains are not modeled as game objects, so the filter is a passive black-box.

## `readable` (ruled)

`readable` applies to things whose **primary purpose is to be read**. Labels on a machine do not by themselves make it readable.

## New traits (defined)

- **`openable`** — a door, lid or drawer gives access to what is inside; a local state that does not drive the plant. Facet `use`; a kind may be both `openable` and `operable`.
- **`slidable`** — a thing that moves in a limited straight run along a line (a drawer); a `fixed` thing cannot be slidable, so it sits in the `handling` facet beside fixed/holdable/luggable. Optional `slideAxis=x|y|z` hint. It applies to a _drawer part_, not to a fixed cupboard that contains one.
- **`safety-gear`** — safety equipment kept for realism; it exists in the world but is not simulated. Facet `role`; a marker.

All three are defined **now as markers only**: they do not set the kind's interaction class (it stays `inspect-only`), and they carry no configuration yet. A later mission revisits each thing, gives it the configuration describing _how_ it slides or opens, and implements the behaviour.

## `panel-like` = thin (ruled)

`panel-like` is reserved for thin things: having **no thickness worth simulating**. A sign, a panel's face, a flat glued-on label. A chart-recorder bank has real depth (paper, pens, its mechanism), so it is `box-like`; a single circular-chart recorder is `cylindrical`.

## Named-object composites (ruled)

Composites are named **after the thing they describe**, not after an abstract family. So `desk` is its own composite (`box-like, floor-standing, supportable, fixed`), `mimic` its own, `safety-shower` its own, and the generic `office-furniture-like` is retired or kept only where a bundle genuinely means one thing. The trait of a desk can simply be `desk`.

## Storage cupboard (ruled, applied)

- wall-mounted and floor-standing cupboards are **different kinds** (different types).
- a cupboard is a `container` and `openable`; a floor-standing one is `supportable`. Its drawers are slidable, but the cupboard itself is `fixed` and so is **not** `slidable`.
- `operable` is dropped.
- the engineer's floor cupboard: `box-like, floor-standing, fixed, openable, container, supportable`.

## Applied in strand 2 (2026-11-04)

New primitives `openable`, `slidable`, `safety-gear`; `container` and `operable` reworded to their new meanings. `filter-like` drops `operable`; `wash-down-like` becomes `box-like, fixed, safety-gear`. Reclassified: `heat-exchanger` (box-like, floor-standing, fixed), `uv-unit` (filter-like + operable), `desk` (box-like, floor-standing, fixed, supportable), `storage-cupboard` (box-like, floor-standing, fixed, openable, container, supportable), `safety-shower` (floor-standing, wash-down-like → box-like, floor-standing, fixed, safety-gear), `alarm-printer` (box-like, floor-standing, fixed, readable), `pump-panel` (box-like, control-panel-like, floor-standing, readable, openable). `audit check` and `unclassified` clean.

Still to do (follow-up): apply the named-object composites (`desk`, `mimic`, `safety-shower`) as composites rather than primitives; extend the panel-inherits-components rule to the other control panels; and revisit `slidable`/`openable` behaviour later.

## Records

Update `TODO.md`, `CHANGELOG.md`, `doc/agent-tooling.md` (support exemption + enforcement rule), and a diary entry. When the vocabulary additions (`openable`, `slidable`) are applied to kinds, add them to the trait files by command, not by hand.
