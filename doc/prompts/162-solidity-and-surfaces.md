# 162: Solidity and surfaces

The owner, 2026-11-04. Part of the one-kind-of-room series (158–165); priority **high**. Brief only; not started until the owner says. Read `CLAUDE.md` and mission 158 first, whose decisions (the registry as gateway, solidity, carrying flags, seats, room styles) this mission follows.

**Needs:** 158 (the flags signed off) and 159.

## What it is

Registered kinds are solid by default (a kind may be flagged non-solid, as many pipes are), their solid shape their bounding box unless the kind declares a better one. Solid sides block the walker and placed objects; solid tops hold placed objects and, where the walker can reach them (a tank roof up its ladder), the walker, as floor does. The room shell's walls and floors are registered. The 1 m drop rule (`CLAUDE.md`) stands at every reachable top's edges. Unregistered things are not solid.

## Findings

- Walk collision is 2D: `src/toolkit/controls/logic/walk-collision.ts:2-55` defines `Footprint`, `overlaps` and `slide`; `src/toolkit/controls/input/first-person.ts:208-225,1360-1383` accepts room-supplied `solids` and `floorAt`. Raised floor/ladder examples are `gallery/rooms/{tank-hall-room:192-202,plant-room:696-712,pool-room:969-984,shell-room:787-810}.ts`. Those call sites must feed the inferred solid/surface registry without losing doorway cuts or existing gantry rules.
- Carried-object collision is separate: `first-person.ts:228-255` passes `supports` and `carrySolids`; `object-handling.ts:163-175,270-341,720-809` recognises `boardSupport`, `placementSurface` and `placementTarget`, and stops held objects only when `carrySolids` is supplied. A bounding box alone has no doorway opening or underside distinction.
- Update `walk-collision.test.ts`, `object-handling.test.ts`, `object-handling-resolve.test.ts`, and raised-platform tests beside the room logic. No generic 3D solid-kind derivation exists yet.

## Approach

1. Add pure logic that converts approved kind flags and object bounds/shape overrides into a walk footprint at the walker's current height, a supporting top, and a carry-solid volume. Keep shell wall/floor registration explicit and cut openings before collision.
2. Feed those derived volumes through the factory's `solids`, `floorAt`, `supports` and `carrySolids` paths; remove duplicated room geometry only after matching existing movement. Include reachability and the 1 m edge rule for tank roofs and other raised tops.
3. Test a boxy boiler, desk, ladder-reached tank top, doorway, non-solid pipe and held object against side/top collision. Check generated volumes against the approved inventory, including shell surfaces.

## Risks

- Current `slide()` sees only X/Z; feeding every bounding box into it would block a walker under overhead pipework and on top of a tank. Animated or open machines need shape updates or approved overrides, and doorway cuts must remain effective.

## Open questions for the owner

None beyond 158's kind/shape census sign-off; a specific bad bounding box should be proposed there for a shape ruling.

## Acceptance

- A boiler's top, a desk and a tank's roof hold a placed object; an object cannot be put into or through a side.
- A ladder-reached tank roof supports the walker and blocks a drop over 1 m at its unladdered edge; a doorway remains passable, an overhead non-solid pipe does not block, and walls/floors retain their existing collision.
- Collider derivation is pure logic in `logic/`, tested.
- The full test suite passes; nothing changes that this brief does not name.

## Coordination

Touches the walk collision, `object-handling.ts`, `placement-target.ts` and the registry: claim on the mailbox and migrate in batches others can see.

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased; `doc/agent-tooling.md` where a tool changes; a diary entry.
