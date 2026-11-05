# 212: the `stackable` trait: simple piles

Split from [206](206-trait-rackable.md) on the owner's word, 2026-11-05: racking is higher priority because the engineer's shelf already arranges software boxes, while stacking has no current implementation. This mission is a small experiment in what composable traits can express, not a general rigid-body physics system. It follows the shared `holdable` and `supportable` systems and 210's deliberate placement. See [the implementation plan](../plans/212-stackable.md).

## Gameplay reason

Tidying up: a player can place a suitable box-like item on a supportable top, then place another on it to make a pile. Software boxes are the first example; future books may work the same way.

## Settled with the owner

- **Upper and lower roles.** The item being placed must be explicitly `stackable` and box-like. The lower target needs a supportable top; it need not be the same kind or itself have `stackable`. A stackable item's top is supportable so the pile can grow. A box dropped on the floor can become the base of a later stack. Ordinary placement on a desk still uses 210's exact aimed spot; alignment into a pile happens when placing on another item.
- **Size test.** Compare horizontal X–Z footprint areas. The upper item's area may be no more than 5% larger than the lower item's. The trait is assigned only to suitable box-like kinds; there is no separate width-and-depth similarity test.
- **Placement.** Align the upper and lower items' approximate centres of gravity, then add independent normally distributed offsets on X and Z. The standard deviation on each axis is 5% of the smaller item's size on that axis. Do not add a clamp or resampling rule for rare large offsets in this first version. The small errors make taller stacks look imperfect.
- **Growth and removal.** There is no pile-height or item-count limit. Only the top item of a pile can be picked up; removing it leaves the rest where they are. Taking an item from the middle, collapse and realistic physical stability are outside this mission.
- **Scope.** This is an experiment in the trait system, not an important gameplay simulation. Do not add tumbling, toppling, rigid-body dynamics or a physics engine. Racking and its designated racks belong to 206.

## What exists today

Stacking has no shared behaviour. A dropped item settles on a room floor or fixed support, not another loose item. Generic USE placement in mission 210 rejects placing one loose item on another until this trait is implemented. `software-box` is a registered, holdable box-like kind with eleven individually bound copies in the engineer's office; a `floppy-disk` is panel-like, so it is not in this first box-like stack.

## What to build

Add `stackable` as an arrangement trait and make its top available through the shared support system. Extend generic USE placement in the one controls resolver to recognise a stackable upper item aimed at a supportable lower item's top, evaluate the area rule, and choose the aligned, slightly offset resting pose. Keep the supporting and top-only pickup rules in shared trait behaviour, never in the engineer's office. Mark the software-box kind `stackable` through the audit command. Tests should cover same-kind and different-kind support, area just inside and outside 105%, offset scale, an unlimited pile, and refusal to pick up a covered item.

## Records

Keep `TODO.md` and `CHANGELOG.md` current when the behaviour ships, and update `src/toolkit/controls/AGENTS.md` if the shared controls contract changes.
