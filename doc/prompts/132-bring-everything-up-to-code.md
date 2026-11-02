# 132: Bring everything up to code

The owner, 2026-11-02: a separate mission from 127. 127 builds the audit screens; this mission fixes what they find, until every room passes `npm run look:audit`. Brief only; not started until the owner says, and not before 127's audit runs for every room. Read `CLAUDE.md`, then 125 to 131.

## What it does

Instrument the builders, not a binder, room by room, each room a commit that leaves its audit cleaner:

1. **Mark architecture and decoration** where rooms are built (the shell, the services ceiling, set dressing), so the first report is about things that matter.
2. **Plant rooms, the boiler house and the control room** (the rooms the owner asks to see most): `room-equipment.ts`, the valves and pipes drawn from each room's network.
3. **Dev rooms,** their exhibits and the objects they place directly (dev0's boards): each room's metadata (titles, kinds, parts) moved into a small pure module beside it, which the room marks its objects from and 126's catalogue reads in place of the room module's `EXHIBITS` (126, rewritten 2026-11-02 as the universal catalogue, left this move to 127).
4. **Museum halls, corridors, the pool halls** and the rest.
5. **Named parts** on the components agents photograph most: the CM6, the mimic boards' readouts, the weather station console, the touch panels, the period PC's screen.

A test compares, room by room, the look targets the catalogue lists with the owners `markComponent` marks, so the two never drift. No tag is invented by hand: an object that should have a tag gets it through the model or the register; one that has no tag is named.

## Done when

Every room passes `npm run look:audit` with no unlabelled, unreachable or duplicate findings beyond those listed with their reasons in `KNOWN_UNLOOKABLE`; the audit then runs in CI (a later step, in `TODO.md`).

## Records

The plan in `doc/plans/132-bring-everything-up-to-code.md`, with each room's findings before and after; `TODO.md`; `CHANGELOG.md` under Unreleased; a diary entry.
