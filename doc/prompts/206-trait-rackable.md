# 206: the `rack` and `rackable` traits: orderly rows

The owner split the former 206 stackable-and-rackable brief on 2026-11-05. Racking is the higher-priority mission because the engineer's office shelf already arranges software boxes. Vertical piles are [212](212-trait-stackable.md). This is a small storage mechanic and an experiment in composable traits, not a general layout or physics engine. Mission 210's animated USE placement is already built; this mission extends it on designated rack targets only. See [the implementation plan](../plans/206-rackable.md).

## Gameplay reason

A rack stores many inspectable things in a compact, legible row. The engineer's shelf of software boxes is the first example. Future machine manuals and small books can use the same behaviour so a player can browse a library of equipment documentation.

## Settled with the owner

- **Two traits meet.** A designated shelf or rack target carries `rack`; an item that can stand stably in an orderly row carries `rackable`. Alignment happens only when a rackable item is placed on a rack. An ordinary desk does not rack things merely because it is supportable. A multi-level shelf exposes one rack target for each level.
- **Eligible items.** Software boxes are rackable. Future small books and machine manuals can be rackable if they can stand on edge. Floppy disks are not rackable because they cannot stand stably by themselves. Rackability is assigned deliberately to a kind; a box-like shape alone does not grant it.
- **Different sizes.** Any rackable items may share a row if each physically fits. There is no 25% size-matching rule; that belonged to the earlier stacking proposal and is superseded. A rack has a usable horizontal width and depth. The sum of item widths along the row plus gaps must fit the rack's width, and every item's four bottom corners must fit its depth. Otherwise placement is refused and the item stays held.
- **Adding an item.** On USE placement, immediately compact the items already on that rack into one contiguous row, choose its left or right end at random for the new item, and centre the resulting row on the rack. Existing items snap to their new positions. The newly placed item alone animates into its assigned end position using 210's placement animation. Its aimed point selects the rack, not an insertion index.
- **Removing an item.** Pick-up removes that item through the usual holdable controls. The remaining items stay where they are, leaving a gap. They compact and re-centre only when another item is added.
- **Outward label.** Every rackable kind declares which local face carries the label to show. The rack turns that face toward the room. For a software box, +Z is its front, −Z its back and ±X its labelled spines; one spine faces outward, like a book. Future manuals may declare a different outward face.
- **Shared rule.** Racking belongs to the rack/rackable traits and the one controls/room-factory system. The engineer's desk's private shelf-row code becomes a use of that system, with no room-name or object-id special case.

## What exists today

The engineer's desk has its own `shelfRow`, `spineOut` and `things.shelve` code, with a 6 mm gap, and refuses a full row. `software-box` is one registered kind with eleven individually bound software titles in four cardboard sizes. The wall shelf is currently built as part of the desk scene rather than a separately registered rack kind. The trait system has no `rack` or `rackable` yet. Mission 210 deliberately left shelf replacement for this mission.

## What to build

1. Add the arrangement traits and their metadata to the registry: rack usable row width, depth, facing and gap (the existing 6 mm gap is a reasonable starting value); rackable outward face and width along the row. Register the engineer's shelf as a kind with `rack`, or make each shelf level a registered rack target, using the audit command for kind changes. Mark `software-box` `rackable` through the audit command; leave `floppy-disk` unchanged.
2. Put pure row-fit and arrangement logic in shared controls logic. It checks width plus gaps and the four-corner depth fit, compacts the old row, randomly selects an end, centres the new row, and returns poses without mutating the scene. The visual layer snaps existing items and animates only the incoming item.
3. Route USE on a rack target through this shared logic and the existing 210 placement animation and carrying cue. Remove the engineer's desk's private shelf-row implementation, while preserving its authored initial display and unrelated desk/carton behaviour.
4. Verify mixed-size rows, both random end choices, centring, full-rack refusal, outward label, a gap left on removal, re-compaction on the next addition, and a multi-level shelf as multiple independent rack targets. Exercise the engineer's office in the browser and run the repository checks.

## Records

Keep `TODO.md` and `CHANGELOG.md` current when implementation ships. Update the controls guide (`src/toolkit/controls/AGENTS.md`) and `doc/agent-tooling.md` if a new inspection or audit tool is added.
