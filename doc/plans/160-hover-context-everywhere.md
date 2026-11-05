# 160 — Hover context in every room: plan and progress

Brief: `doc/prompts/160-hover-context-everywhere.md`. The owner, 2026-11-04, urgent, [ready]; replanned 2026-11-05 against 159, 161, 169 and the trait missions. Hovering over a thing names it, the same in every room: the room factory (`createRoomController`) installs the inspection line (prompt 061) for every room, so every lookable object in every room is named when aimed at.

## Approach (the brief's; kept)

1. **The factory wires it.** `createRoomController` builds one inspector for every room from what it already has (`scene`, `camera`, `metre`), plus two optional room inputs kept as data, not behaviour: `world` (the live-state reader) and `identify` (dev0's adapter). Rooms stop passing `inspect`; the seven sites and `plant-room.ts`'s `INSPECTED` gate go.
2. **Name from identity, then kind.** The nearest owner's identity wins as now; where a hit's owner has no identity but a registered kind (`equipmentKindOf` up its parents), it is named by the kind's `type` (and the binding's thing as its tag, where the registry gives one). Unregistered, unidentified things stay silent and still block.
3. **Share the hit with 161.** Both use the same first-visible-hit rule; 161's resolver (my plan `161-one-click-handler.md`) lands the shared cached hit where reach allows.
4. **Replace the opt-in with a contract.** `INSPECTED_ROOMS`, `KNOWN_UNINSPECTED` and the slow guard test are removed; a fast contract test checks no room starter passes `inspect` and the factory installs it.

## Progress (2026-11-05, sayuri_shantian; mission almost complete — browser check stays)

**Done (this commit):**

- `room-controller.ts`: a registration seam like the carrying traits — `useRoomInspector(factory)` and `roomInspectorFor({scene, camera, metre, world, identify})` — and `createRoomController` installs the overlay for every room from its own scene; `RoomControllerOptions` gains `world`/`identify` as data.
- `inspect-pick.ts`: kind-based naming (a kind-only thing named by its registered `type`, its bound thing as the tag where its own values match a binding); `installRoomInspector()` and the game-side registration.
- The seven `inspect: createInspector(...)` sites removed (`shell-room`, `plant-room-shell-room`, `plant-room` (the `dev51` gate too), `museum-hall-room`, `tank-hall-room`, `co2-cage-room`, `controls-room`); the rooms' `world` and dev0's `identify` now pass to the controller as data.
- `INSPECTED_ROOMS`, `KNOWN_UNINSPECTED` and `inspected-rooms.slow.test.ts` removed; a fast contract test (`inspected-rooms.test.ts`) checks the starters leave `inspect` to the factory and the factory builds from the room's scene/camera/metre, world and identify.
- `inspect-pick.test.ts` extended: kind-only things named by their kind's type and bound thing; an unregistered, unidentified thing stays silent and still blocks. `main.ts` and `magic-room.ts` register the inspector beside `installRoomTraits`.
- The shared browser stub (`inspection-audit.ts`) now serves `createImageData`/`putImageData`, enough for a room controller.

**Pending:**

- Frame time in the Olympic plant room measured in the browser, no worse than today with the inspector on (the nearby-mesh filter and idle warming are kept in `createInspector`).
- Whatever the coverage audit shows for the newly-covered rooms, to be fixed by their builders, not by room exceptions.

**Review (nicole_buruaah, 2026-11-05) — all addressed:**

- `inspect` is no longer accepted in `RoomControllerOptions` (`Omit<FirstPersonOptions, 'inspect'>`); the factory is the only way, and the `?? options.inspect` fallback is gone. The fast test's regex stays as a backstop.
- `boundTag` reads only the one explicit bound-thing marker (`userData.boundThing`) on the kind-carrying object itself (`markEquipmentKind(obj, kind, thing)`; the desk's software boxes set it), and only when that thing is one of the kind's bindings — no scanning of every `userData` value, no walking past the kind owner, nothing guessed.
- The bindings are cached once per kind (a module `Map`), never rebuilt from `kindFiles()` per hit.
- The leftover empty `inspected-rooms.ts` module is deleted; its history lives in the test header and this plan.
- The doc comment in `room-controller.ts` names the right registration site (`installRoomInspector` in `inspect-pick.ts`).
- Coverage pin: the audit's harness (`createRoomEquipment`) can build only the 12 equipment/office rooms it already audits — museum halls, the tank hall, dev0 and the corridor build elsewhere and return empty here, so extending the pin with vacuous zeros would be a lie. Those rooms' coverage is the contract test's job (no starter passes `inspect`). The 12 audited rooms' counts are unchanged (all 0), so the pin does not move.

## Records

TODO (160, Incomplete pending the browser check), CHANGELOG (under Unreleased), `doc/agent-tooling.md` (the overlay is now everywhere; the opt-in is gone), a diary entry.
