# 206: rack and rackable plan

The owner-approved behaviour is in [the mission brief](../prompts/206-trait-rackable.md). Build this before 212 because the engineer's office shelf already has a private version to replace.

## Representation

Add `rack` for a designated one-row support and `rackable` for a stable, label-out item. Each level of a multi-level shelf is a separate rack target. A rack declares usable row width, depth, facing and gap; a rackable kind declares its outward local face. Register the engineer's shelf target as a kind through `npm run audit`; add `rackable` to `software-box` through the same command. Do not classify floppy disks as rackable.

## Shared placement

Resolve USE on a rack target through the one controls system. Pure logic checks the total row widths plus gaps and all four bottom corners against the rack's usable depth. With enough room, retain the existing row order, choose the new item's left or right end at random, compact and centre the row, and return all final poses. Existing items snap at once; the new item uses 210's half-second placement animation. If it does not fit, retain it in hand with the existing impossible-action cue. Taking an item out leaves the others in place until the next addition.

## Migration and verification

Replace `engineers-desk.ts`'s private `shelfRow` and `things.shelve` placement with the shared rack system. Keep its authored starting arrangement and unrelated desk/carton behaviour. Test mixed-size fit, refusal, both end choices, label-out rotation, centring, snap-versus-animation, removal gaps and the next addition's compaction. Inspect the engineer's office using the project audit and look tools before browser work. Record what relational traits required from the registry, resolver and audit pages, then run the required checks.
