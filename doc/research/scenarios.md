# Research: defining scenarios (#99)

Research for [#99, Definition of Scenarios](https://github.com/trebizondoculpepper/the_pool/issues/99): what the game already has for each part of the ticket, what is missing, where the work must go, and the questions the owner should settle before implementation. Read against `main` at 36e46d12 (2026-11-07). No code was changed.

## Summary

Most of the parts exist, but none of them was built for a session that spans rooms. Five findings decide the shape of the work:

1. **A scenario is not a room feature.** #96's research (`doc/research/225-room-traits.md`) proposes a `scenario-engine` room feature, reset on entering a room. #99's scenario lives across rooms (it starts in the loading bay and finishes in the control room), so it must sit above the rooms, beside the world store and the game session in `main.ts`, not in the room factory. Rooms only report events to it (entered, later object state); this is the boundary #99 asks to coordinate with #96.
2. **An isolated world already exists, but its clock ignores pause.** `createScenarioStore` (`src/toolkit/save/world-store.ts:266`) is an in-memory world, never loaded or saved, and `setRoomWorld` puts it under every room. But its clock runs on `setInterval` and wall time and never checks `paused` or `clockStopped`, unlike the saved store (`world-store.ts:413`). Using it for a gameplay scenario needs a pause-aware clock.
3. **The player's save is reached directly, not only through `roomWorld()`.** `main.ts` refers to `worldStore('dev')` 15 times: the console, `saveGame`, `rememberPlayer` (the Continue position, written every 10 s), New Game, and others. During a scenario every one of these would still read or write the player's own save. Isolation means routing them through the active session, or switching them off while a scenario runs.
4. **The phone inbox is global, untyped and not part of the world.** `phoneInbox` (`src/toolkit/controls/logic/phone-menu.ts:39`) is a module singleton seeded with three sample texts. Its messages are free text with numeric ids handed out at runtime, so there are no "message identifiers" to validate, and nothing resets it. A scenario needs its own inbox (or a clear one) and a typed message catalogue.
5. **Room entry has one choke point.** Every room change goes through `openRoom()` in `main.ts`, after the `?room=` address is updated: by walking through a doorway (the handover at `main.ts:2320`), by a pose handover (`main.ts:1986`) or by `goTo`. A typed "room entered" event can be raised there once, for every way of arriving.

## What exists, part by part

| #99 needs                        | What exists                                                                                                                                                                                             | Gap                                                                                                                                                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Isolated scenario world          | `createScenarioStore(start)` + `setRoomWorld` (`world-store.ts:257–313`): in memory, own event log, `save()` returns false. Used by attract shots (`main.ts:1386`), dev39's mimics and the magic rooms. | Wall-clock `setInterval`, no pause check. `main.ts` bypasses `roomWorld()` (finding 3).                                                                                                                |
| Scenario simulation time         | `world.time`, advanced by the store. dev71's room script already steps from world time, not wall time (`plant-room.ts:779–840`, a8c1d4ee).                                                              | Must be read from the scenario store's world, and stop with `paused`.                                                                                                                                  |
| Spawn pose                       | Poses are already addresses: `?room=…&x&y&z&yaw&pitch&zoom` (`rememberPlayer`, `main.ts:212`).                                                                                                          | Need the yard coordinates outside `loading_bay`, facing south (the building). The yard is part of the loading bay's scene (`shell-room.ts:159–200`, `dock-yard`), not a room of its own.               |
| Room entry                       | `openRoom()` after every address change; `resolveRoomId` and the `RoomId` type (`dev-room-links.ts`) for type-checked ids.                                                                              | No event is raised.                                                                                                                                                                                    |
| "The control room"               | Shell room `control_room`. Its corridor doors lead to the bridge (`bridge`) instead when the CONTROL ROOM MODE knob is on NEW (`control-room-mode.ts`).                                                 | **Owner decision:** does arriving at the bridge count?                                                                                                                                                 |
| Phone messages                   | `phoneInbox.receive(from, text)`, `subscribe`; the alert in `main.ts:310`; the phone view in `first-person.ts:380`.                                                                                     | Global singleton with sample texts; no message ids; no reset.                                                                                                                                          |
| Timed one-shot rule              | `createPhoneMessageTrial` (`gallery/logic/phone-message-trial.ts`): elapsed-time thresholds, each fired once, `reset()`.                                                                                | Hard-coded to two thresholds; marked as a one-off. The scenario runner replaces it, and dev71 can become the first scenario's test bed.                                                                |
| Data validated by type and build | Registries checked by the compiler and by tests: kinds (`defineKind`, `kinds/index.ts`), traits (`defineTrait`).                                                                                        | A `defineScenario` and a scenario index in the same style give typed scenario ids, room ids and message ids.                                                                                           |
| Restart and exit                 | The Continue address (`game-session.ts`) and New Game (`location.assign`, a full page load).                                                                                                            | A full page load loses an in-memory session. The scenario should be in the address (`?scenario=first-test`) so a reload restarts it deterministically rather than dropping the player into their save. |
| Success presentation             | #101 (scenario success fanfare).                                                                                                                                                                        | Out of scope here; the runner only exposes the success transition.                                                                                                                                     |

## The word "scenario" is used three ways

- **Attract scenarios** (`src/game/attract-scenarios.ts`, `createScenarioStore` in `main.ts`): frozen worlds for the title's camera shots. #99 says to keep these apart.
- **Room scenario engines** (#96's `scenario-engine`): museum games and dev rigs, reset on entering their room.
- **Gameplay scenarios** (#99): cross-room sessions with rules, messages and success.

Using one word for all three will confuse agents. Suggest calling #99's object a **scenario**, renaming the store to something like `createMemoryWorld` (it is an in-memory world, whoever uses it), and #96's feature a **room engine**.

## Proposed shape

Pure logic, in `src/game/scenarios/` (no DOM or Three.js, tested beside it):

- `defineScenario({ id, title, spawn, rules })`, one file per scenario, listed in an index, so ids are a typed union.
- `spawn: { room: RoomId, x, y, z, yaw, pitch }`.
- A rule: `{ id, when: Condition, do: Action[], fire?: 'once' | { every, anchor?, until?, max? } }`, `once` by default.
- Conditions: `{ after: seconds }` (relative to the previous rule firing, as #99 says), `{ entered: RoomId }`, and `all` / `any` / `not`. Later conditions (proximity, model state with units, transitions) are new members of the same union.
- Actions: `{ text: MessageId }` and `{ succeed: true }`. Messages live in a typed catalogue (`PHONE_MESSAGES`), so a wrong id fails the type check.
- A runner: `createScenarioRun(scenario)` with `step(dt)`, `event(e)` (room entered), `reset()`, and state `{ elapsed, fired, succeeded }`. It is driven by world time, so pausing stops it, and a condition that stays true fires once (edge-triggered). This replaces `createPhoneMessageTrial`.

Wiring, in `main.ts` and the save layer:

- A **session** switch: the player's save (`worldStore('dev')`) or a scenario's memory world. `roomWorld()`, the console, `saveGame`, `rememberPlayer` and the Continue position all go through it; while a scenario runs nothing writes the player's save or Continue position.
- An **injectable inbox**, as `setRoomWorld` does for the world: `phoneInbox` becomes the current session's inbox, and a scenario starts with an empty one.
- `openRoom()` raises `room entered` to the running scenario.
- Start from the title (a Scenarios entry) and from `?scenario=<id>`. Restart rebuilds the memory world and the run. Exit drops both and returns to the title, with the player's save untouched.

## Risks

- **Missing one of the 15 direct save uses** is the likely way isolation fails. A test should open a scenario, play it, exit, and check the player's stored save and Continue position are byte-for-byte unchanged.
- **Doorway look-through** builds neighbouring rooms and draws them. They read `roomWorld()`, so they follow the session switch, but any that cache the store when built must be rebuilt on switching.
- **Two tabs:** the saved store uses a Web Lock. A scenario in one tab and the save in another is fine, as long as the scenario never takes the slot.

## Questions for the owner

One at a time, in this order:

1. Does arriving at the bridge (the CONTROL ROOM MODE knob on NEW) count as entering the control room?
2. Where does the player start a scenario: a Scenarios entry on the title screen, the pause menu, or only `?scenario=` for now?
3. On exit, does the player return to the title screen or straight to their own game?
4. May the attract sequence's `createScenarioStore` be renamed (finding: one word, three meanings)?
