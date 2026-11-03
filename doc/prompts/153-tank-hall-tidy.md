# 153: The Olympic's tank hall: PL2-T1-LT1's cable straight up to the control bus, the room at full height, and a services ceiling

The owner, 2026-11-03, in the Olympic pool's balance tank hall (`http://127.0.0.1:5175/?room=tank_hall&from=plant_pool_02`): "re-plumb the wire from PL2-T1-LT1 in the balance tank room. It's a messy wire that should go directly up to the ceiling and then to the control bus. Also, make this room the same height as others in the complex. At the moment it has the breeze block texture but it should really have the decorative utility ceiling texture we used elsewhere." `nicole_buruaah` investigated and wrote this brief for a new agent. Brief only; not started until the owner says.

## Read first, in this order

1. `CLAUDE.md` (it is `AGENTS.md`): the whole of it, and especially: the model comes first and the scene only binds; nothing is drawn that is not in the model; the services ceiling rule; the walker never drops more than 1 m; work in the main checkout on `main`, no worktrees; the commit rules.
2. `doc/agent-tooling.md`: look links, the room audit, the simulation graph pages. Use them; don't hunt coordinates by hand.
3. `doc/plant-model.md` and `doc/room-layout-guide.md`: the plumber, routes, containment.
4. This brief, then the files it names.

## What there is now (read 2026-11-03)

- **The room:** `tank_hall`, "TANK HALL – OLYMPIC POOL" (`src/toolkit/gallery/logic/dev-room-links.ts`), built by `src/toolkit/gallery/rooms/tank-hall-room.ts` with its contents from `src/toolkit/gallery/rooms/plant/balance-tank-hall.ts` and its geometry from `src/toolkit/gallery/logic/balance-tank-hall.ts`. `HALL.height` is **3.2 m**, its comment saying "its soffit under the pool's surround". Its upper walls and soffit are blockwork, `createBreezeBlockTextures` (`tank-hall-room.ts`, about lines 99–125). The plant rooms are `PLANT_ROOM.storey` = 3.5 m a storey (`src/toolkit/gallery/logic/plant-rooms.ts`), the plant floor 3.5 m below the deck and the roof 3.5 m above it; the shell rooms such as the boiler house are 7 m (`src/toolkit/gallery/logic/shell-rooms.ts`).
- **The transmitter:** PL2-T1-LT1, an ultrasonic level transmitter (`createUltrasonicLevel`) on an arm off the gantry's south rail (`SPOTS.transmitter` in `logic/balance-tank-hall.ts`), marked with `model: { node: 'tank-level-transmitter' }` (`rooms/plant/balance-tank-hall.ts`, about lines 400–420).
- **Its cable, the messy wire:** `hallLevelCable()` (`logic/balance-tank-hall.ts`, about lines 186–198) is a hand-written polyline: out of the side gland, up to 0.25 m under the soffit, south, then west through the partition. It is drawn as a `createFlexHose` (about line 421: a flexible hose standing in for a cable) with two hand-placed saddles. It is bound to `model: { link: 'tank.level-signal' }`.
- **The model link:** `src/toolkit/gallery/logic/olympic-annex.ts` (about line 105): `link('tank.level-signal', ['tank-level-transmitter','signal'], ['tankPanel','level'], 'power')`. Its medium says `power`; a 4–20 mA level signal is `control` (check the media in use and correct it).
- **What plant rooms use instead:**
  - **The control bus** (`src/toolkit/gallery/logic/control-bus.ts`, `controlBus(room)`): one run of compartmented steel trunking in a ring round the room just above door level. Every control device (`isControlDevice`) sends a short conduit to its nearest point, instead of a line of its own across the room, and the bus rises into the services ceiling at the supply wall.
  - **The cable containment** (`logic/cable-containment.ts`) and **room services routing** (`logic/room-services.ts`) for conduit and trays.
  - **The services ceiling** (`src/toolkit/components/site-dressing/views/service-ceiling.ts`, `createServiceCeiling(room, options)`): a procedural deck, beams, trays, ducts and pipework overhead, used as set decoration over every plant room. See how `src/toolkit/gallery/views/plant-room-shell.ts` (about line 400) builds it: `createServiceCeiling({ minX, maxX, minZ, maxZ, deckY: roof }, { seed, density: 0.85 })`.

## What to do

### a) Which components to use

- **Ceiling:** `createServiceCeiling` from `src/toolkit/components/site-dressing/views/service-ceiling.ts`, built as the plant rooms build it (`plant-room-shell.ts`). It replaces the blockwork soffit; it is static set decoration, not part of the plant model (CLAUDE.md's one exception). The blockwork walls stay blockwork.
- **The signal's route:** the room's **control bus** (`control-bus.ts`) and its conduit drop, as every other control device in a plant room has: give `tank_hall` a control bus if it has none (`controlBus(room)` returns null for a room with no layout or no control devices; find out why, and extend it to this room the way it is built for plant rooms), and make PL2-T1-LT1 a control device on it (`isControlDevice`, or by deriving from the kind's class if mission 147's registry has landed).
- **The cable itself:** drawn with the same conduit and containment parts the plant rooms' control devices use for their drops (find them from `control-bus.ts` and `cable-containment.ts` and the rooms that draw them), not `createFlexHose`, and with no hand-placed saddles.
- **No new components** unless none of these fits; if you think one is needed, ask first (c).

### b) How to plumb it

- **Model first.** The route follows the model: `tank.level-signal` from the transmitter's `signal` port to `tankPanel.level`. Check that `tankPanel` (the Olympic's balance tank panel) is where the signal is meant to arrive, and correct the link's medium to `control` (check what else reads it, and the tests). Nothing is drawn that the model does not have; if the route needs a node (a junction box on the bus), add it to the model before drawing it.
- **The route:** from the transmitter's cable gland, **straight up** to the services ceiling's containment (or the control bus at its height, whichever the room's layout puts above the transmitter), then **along the bus** to where the panel's own drop leaves it. One vertical drop and the bus; no diagonal runs, no free-hanging loops. Derive the points from the room's geometry and the bus (pure, in `logic/`, tested), not from hand-typed coordinates.
- **Remove** `hallLevelCable()`'s hand-written polyline and its saddles, or replace its body with the derived route, and update its users and tests.
- **The room's height:** raise `HALL.height` so the tank hall's ceiling height matches the other plant rooms. Before changing it, check the building: the world is one contiguous building in metres (`src/game/facility-plan.ts`), and the hall's comment says its soffit is under the Olympic pool's surround. Find what is above it (the pool hall's deck), its doors and stair (`DOORWAY`, the gantry), the pipes that pass through its walls (`HALL_PIPES`, the routes in `logic/balance-tank-hall.ts`), and the dry peeks and doorway joins (`door-joins.ts`). If raising it would collide with the pool hall above or break the building's levels, **stop and ask the owner** (c) with what you found and the options; don't guess.
- **Check by look link and audits** after each step: `?room=tank_hall&look=PL2-T1-LT1&mode=front` and `mode=left`; the room audit (`bench.html?bench=room-audit&room=tank_hall`): no unbound, orphan or unnamed flags for the transmitter or its cable; the simulation node page for the transmitter shows its signal reaching the panel.

### c) How to ask for help

- **Agents first,** on agent-inbox (`agent-inbox send -s "<subject>" <agent> "<text>"`; read with `agent-inbox inbox` and `agent-inbox read <id>`). Write a subject that says what you need, and a self-contained message: what you're doing, what you found (file:line), what you tried, and the exact question.
  - `nicole_buruaah` wrote this brief: ask about its intent, the control bus and the services ceiling.
  - `bala_qasim` knows the Olympic's plant (missions 144 and 148) and the plumbing modules.
  - `sayuri_shantian` works on the walker and walkable surfaces (mission 151): ask about the room's floors and heights.
  - `ahnaa_dmitrieva` built the audit and look tools (missions 127 to 138).
- **The owner** for decisions only: the room's height if the building gets in the way, and anything this brief does not settle. One question at a time, with your recommendation.
- **When stuck:** after two failed attempts at the same thing, stop and ask, rather than trying a third way that changes more.

### d) Communications protocol

1. **Before you start:** read your mail (`agent-inbox inbox`). Then send a claim to `ahnaa_dmitrieva`, `bala_qasim`, `farhad_taphrale`, `sayuri_shantian` and `nicole_buruaah` (not `everyone`): "Taking mission 153", the files you expect to touch (`tank-hall-room.ts`, `rooms/plant/balance-tank-hall.ts`, `logic/balance-tank-hall.ts`, `olympic-annex.ts`, `control-bus.ts`, and any others), and ask whether anyone is mid-edit in them. Wait for objections before editing a file another agent has claimed.
2. **World state:** this mission should not change the world's shape. If it must, reserve the next `WORLD_VERSION` on the mailbox first, and add a migration.
3. **While working:** the checkout is shared (several agents, one dev server). Stage only your own files, through a private index (`GIT_INDEX_FILE=<a new path in your scratchpad> git read-tree HEAD`, then `git add <your files>`, `git commit`, then `git reset -q -- <your files>`). Never `git add -A`, and never stage `package.json`, `package-lock.json`, `agent-inbox.toml` or `.claude/settings.json`. For `TODO.md` and `CHANGELOG.md`, stage only your own lines. Don't start a git worktree. Don't spawn sub-agents without the owner's permission. Don't restart the shared dev server on port 5175; use your own port for throwaway servers, and stop them.
4. **Tests:** run your targeted tests with `--maxWorkers=2` as you go. Before your final push, run `npm run typecheck`, `npm run lint`, `npm run format:check` and `npm run build`, then one full `npm test`. Announce "Starting a full npm test" before it and "finished" after, and don't start one while another agent's is announced as running on the same Mac. Wait on your run with `kill -0 <pid>`.
5. **Commit and push:** pull with `git -c credential.helper= -c credential.helper='!gh auth git-credential' pull -q --rebase --autostash origin main`, then push the same way. End every commit message with the session's attribution lines, as the other agents do. If a release has been announced as running, wait until it is done before pushing.
6. **After pushing:** mail the same five agents: what finished, the commit, any follow-ups, and that your files are free. Answer their questions and review findings promptly.

## Acceptance

- In the browser: PL2-T1-LT1's cable leaves its gland, rises straight to the ceiling's containment or the control bus, and runs with the bus to the panel: no loose loops, no diagonal hose. The room's ceiling is the services ceiling, not blockwork. The room is the same height as the other plant rooms, or the owner has ruled otherwise. Screenshots by look link in the plan.
- The model: `tank.level-signal` is a `control` link from the transmitter to the panel, and every drawn piece of the cable is bound to it.
- The audits: the room audit flags nothing new for the transmitter, its cable or the bus.
- Tests: the route's derivation, the bus in this room, and the updated hall geometry, all beside their logic; the checks above green.

## Records

The plan in `doc/plans/153-tank-hall-tidy.md`; the CHANGELOG under Unreleased (`### Fixed` for the cable, `### Changed` for the room's height and ceiling); `TODO.md`: this mission, ticked with its date and commit, and any follow-ups; `doc/agent-tooling.md` if you change a tool.
