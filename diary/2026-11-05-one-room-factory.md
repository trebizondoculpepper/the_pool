# One room factory, 2026-11-05

Mission 159 moved the 42 room-starter calls for first-person control behind `createRoomController`, including both lift controllers, the rendering starters and the magic room. The factory forwards the existing options unchanged to the shared first-person controller and reserves a typed `standard` room-style slot for a later owner-approved alternative. `main.ts` now reads the mounted canvas's controller through the factory contract; its one-handle-per-room cache and the starters' scene, callback and frame loops remain as they were.

A fast source guard checks that the 41 starter files use the factory, that the lift retains its second controller, and that no runtime starter imports or calls `createFirstPerson` directly. The controller and room logic regression tests, typecheck, lint, format check, full local test suite, build and five-room browser smoke were used for verification.

The broad starter migration was coordinated through agent-inbox. Mission 202 held `first-person.ts` and `pool-hall-room.ts` while it finished its water-movement changes; the pool hall migration followed its push and release so the factory was built on the updated controller without changing its behaviour.
