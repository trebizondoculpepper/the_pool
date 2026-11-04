# 160: Hover context in every room

The owner, 2026-11-04. Part of the one-kind-of-room series (158–165); priority **urgent**. Brief only; not started until the owner says. Read `CLAUDE.md` and mission 158 first, whose decisions (the registry as gateway, solidity, carrying flags, seats, room styles) this mission follows.

**Needs:** 159.

## What it is

The factory wires the inspection line (prompt 061, `src/toolkit/controls/logic/inspection.ts`) for every room from the registry, so every registered object, in every room, is named when aimed at (its name, and its tag where it has one; the no-peeking rule stands). Unregistered things stay silent. `INSPECTED_ROOMS` (`src/toolkit/gallery/logic/inspected-rooms.ts`) and its per-room opt-in go; the main corridor's known gap closes.

## Findings

- `src/toolkit/controls/input/first-person.ts:275,1575-1617` only calls inspection when an `inspect` option is passed. Seven starter sites pass `createInspector`: `gallery/rooms/{shell-room:821,plant-room-shell-room:407,plant-room:738,controls-room:595,museum-hall-room:359,tank-hall-room:212,co2-cage-room:408}.ts`; `plant-room.ts` additionally gates it to `dev51` at line 94. The main corridor at `main-corridor-room.ts:453-498` has no inspector.
- `src/toolkit/gallery/views/inspect-pick.ts:38-119` already enforces first visible hit, 3 m reach, component ownership and no peeking; `src/toolkit/controls/logic/inspection.ts:12-63` supplies the 150 ms stable hover line. `INSPECTED_ROOMS` is at `gallery/logic/inspected-rooms.ts:20`; `KNOWN_UNINSPECTED` and the opt-in guard are in `inspected-rooms.slow.test.ts:36-138`. `inspection-coverage.json` and `inspection-coverage.slow.test.ts` pin the existing audit.
- Current `ObjectDescriptor.kind` is a string (`src/game/descriptors/descriptor.ts:93-100`), while scene picking uses `owningComponent`; the factory must join kind registration to the identity mark, without revealing hidden controls or model-only status.

## Approach

1. Give the factory a room scene/root, camera, scale and optional world reader; install one `createInspector` path for every starter, preserving each existing world/identify adapter and no-peeking pick order.
2. Register scene identity for approved kinds missing it (including the corridor and magic item), then remove seven per-starter `inspect` options and `plant-room.ts`'s `INSPECTED` gate. Unregistered meshes remain silent and block the ray where appropriate.
3. Replace `INSPECTED_ROOMS` and `KNOWN_UNINSPECTED` with a fast all-starters contract; update the slow coverage audit/pin for the intentional increase and test occlusion, tag/name and live detail.

## Risks

- The existing inspector warms mesh bounds and filters nearby meshes (`inspect-pick.ts:46-95`); a naïve all-scene raycast will hurt large plant rooms. Magic room has its own starter and may lack identity on its item/control panel.

## Open questions for the owner

None; the registry gateway and no-peeking rule settle what should be named.

## Acceptance

- Hovering a registered object names it in a pool hall, a plant room, the main corridor, dev0 and a magic room.
- The seven starter-specific inspector options, `INSPECTED_ROOMS`, `KNOWN_UNINSPECTED`, and the `dev51` gate are removed; the new guard covers every starter and a hidden object behind an opaque first hit remains unnamed.
- The full test suite passes; nothing changes that this brief does not name.

## Coordination

Touches the factory, `inspection.ts`, `inspected-rooms.ts` and its tests: claim on the mailbox and migrate in batches others can see.

## Records

`TODO.md`; `CHANGELOG.md` under Unreleased; `doc/agent-tooling.md` where a tool changes; a diary entry.
