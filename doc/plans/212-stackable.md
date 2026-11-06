# 212: stackable plan

The owner-approved rules are in [the mission brief](../prompts/212-trait-stackable.md). This is a later trait-system experiment; 206's rack placement has priority. It builds on 210's generic USE placement and the shared support system.

## Trait and placement

Add `stackable` to the arrangement facet for deliberately chosen, holdable, box-like kinds; make a stackable item's top supportable. Mark `software-box` through the audit command. The lower target can be any supportable top and need not share the upper kind's `stackable` trait. Ordinary placement on a desk retains 210's aimed spot; a stackable item is only stacked (aligned to the lower centre with error offsets) when it is placed on another item of a comparable size. Pure logic checks that its X–Z footprint area is at most 105% of the lower item's area (both alike), and — only within a pile's size band of the lower (`isPile`, ratio ≤ 1.6, the owner's 2026-11-06 ruling) — adds independent normal X and Z offsets with standard deviations of 5% of the smaller item's dimensions on those axes. On a much larger top (a book on a desk) it is ordinary placement, not a pile: `stackPose` returns `ok: false` and the resolver keeps 210's aimed spot. There is no pile limit or collapse model.

## Shared support and pickup

Add settled stackable tops to the shared support query so later items can land on them. The one pick-up resolver offers only the uncovered top item of a pile; removing it leaves the rest in place. Avoid room- or kind-named checks. A thrown item may use the ordinary support landing rule, but deliberate USE placement is what applies the centring and offset arrangement.

## Verification

Test same-kind and different-kind stacks, the 105% area boundary, the offset scale with a controlled random source, growth beyond eight items, top-only pick-up, ordinary desk placement and a box on a floor-settled box. Verify the trait and its kind classification through `npm run audit`, inspect the result in a simple room, and run the required checks.
