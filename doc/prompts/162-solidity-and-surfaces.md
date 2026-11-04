# 162: Solidity and surfaces

The owner, 2026-11-04. Part of the one-kind-of-room series (158–165); priority **high**. Brief only; not started until the owner says. Read `CLAUDE.md` and mission 158 first, whose decisions (the registry as gateway, solidity, carrying flags, seats, room styles) this mission follows.

**Needs:** 158 (the flags signed off) and 159.

## What it is

Registered kinds are solid by default (a kind may be flagged non-solid, as many pipes are), their solid shape their bounding box unless the kind declares a better one. Solid sides block the walker and placed objects; solid tops hold placed objects and, where the walker can reach them (a tank roof up its ladder), the walker, as floor does. The room shell's walls and floors are registered. The 1 m drop rule (`CLAUDE.md`) stands at every reachable top's edges. Unregistered things are not solid.

## Acceptance

- A boiler's top, a desk and a tank's roof hold a placed object; an object cannot be put into or through a side.
- The walker can stand on a tank roof it reached by ladder; walls and floors behave as now.
- Collider derivation is pure logic in `logic/`, tested.
- The full test suite passes; nothing changes that this brief does not name.

## Coordination

Touches the walk collision, `object-handling.ts`, `placement-target.ts` and the registry: claim on the mailbox and migrate in batches others can see.

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased; `doc/agent-tooling.md` where a tool changes; a diary entry.
