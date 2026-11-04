# 153: The Olympic's tank hall: PL2-T1-LT1's cable straight up to the control bus, the room at full height, and a services ceiling

## Model and control bus

In `src/toolkit/gallery/logic/olympic-annex.ts`, the level transmitter's link `tank.level-signal` from `tank-level-transmitter.signal` to `tankPanel.level` is corrected from medium `power` to `control`, matching its 4–20 mA signal.

In `src/toolkit/gallery/logic/room-structure.ts` and `src/toolkit/gallery/logic/control-bus.ts`, `tank_hall` is given its room structure (`TANK.minX` to `TANK.maxX`, `TANK.minZ` to `TANK.maxZ`, 7 m soffit, and `TANK_BUS.ceilingY` at 6.45 m for its non-acoustic services ceiling) and its control bus ring (`controlBus('tank_hall')`) at `DOOR_HEAD + OVER_LINTEL` (2.85 m) with a riser on the west partition wall into the services ceiling. `level-transmitter` is added to `isControlDevice`.

In `src/toolkit/gallery/logic/balance-tank-hall.ts`, `hallLevelCable()` is derived from the transmitter's cable gland (`[tx.x + 0.11, tx.y + 0.2, tx.z]`), stepping 5 cm out for a 90° screwed-conduit elbow (`[tx.x + 0.16, tx.y + 0.2, tx.z]`), rising straight vertically to the control bus height (`[tx.x + 0.16, TANK_BUS.y, tx.z]`), and running square into the south wall's control bus trunking (`[tx.x + 0.16, TANK_BUS.y, TANK.maxZ - TANK_BUS.off]`). In `src/toolkit/gallery/rooms/plant/balance-tank-hall.ts`, the old `createFlexHose` and two hand-placed overhead saddles are replaced by the room's `createContainment` control bus ring (marked with `model: { node: 'control-bus' }`) and a rigid 20 mm `steel-screwed` conduit drop (`createPipe`, marked with `model: { link: 'tank.level-signal' }`).

## Room height and services ceiling

Checking the building plan (`src/toolkit/gallery/logic/olympic-plan.ts`) confirmed that the Olympic pool hall (`pool_02`) sits to the east of `plant_pool_02` (`DOORS.pool` on the east wall at deck level `y = 0`), while `tank_hall` opens off `plant_pool_02`'s west wall (`DOORS.tank` at the plant floor `y = -3.5`). Nothing in the building lies above `tank_hall`, and the make-up pipe's partition penetration (`SPOTS.makeup.high = 2.95 m`) is independent of `HALL.height`. Raising `HALL.height` from `3.2 m` to `2 * PLANT_ROOM.storey` (`7 m`) brings the tank hall to the same height as the other plant and shell rooms in the complex, extending the blockwork walls, the partition wall, and the two overflow return drops cleanly to the 7 m ceiling.

In `src/toolkit/gallery/rooms/tank-hall-room.ts`, the blockwork soffit slab is replaced by `createServiceCeiling({ minX: TANK.minX, maxX: TANK.maxX, minZ: TANK.minZ, maxZ: TANK.maxZ, deckY: h }, { seed: 28, density: 0.85 }).group`, keeping the blockwork walls. `startTankHall` also exposes `look: { settled: Promise.resolve() }` so look links and the room audit work directly on `tank_hall`.

## Verification

- Look links verified on the shared dev server:
  - `?room=tank_hall&look=PL2-T1-LT1&mode=front` (`8/9 seen`): `http://127.0.0.1:5175/?room=tank_hall&x=1.62&y=1.00&z=1.90&yaw=0.0&pitch=-50.4&zoom=1.602&noclip=true`
  - `?room=tank_hall&look=PL2-T1-LT1&mode=left` (`9/9 seen`): `http://127.0.0.1:5175/?room=tank_hall&x=1.33&y=1.00&z=1.86&yaw=35.0&pitch=-48.0&zoom=1.445&noclip=true`
  - `?room=tank_hall&look=link:tank.level-signal&mode=front` (`9/9 seen`): `http://127.0.0.1:5175/?room=tank_hall&x=1.74&y=1.68&z=3.07&yaw=0.0&pitch=0.0&zoom=0.650&noclip=true`
- Room and look audit (`npm run look:audit -- tank_hall`): `PL2-T1-LT1` (`node:tank-level-transmitter`), `Level transmitter signal cable — south to control bus` (`link:tank.level-signal`), and `Control bus` (`node:control-bus`) are all bound Look targets with zero unbound, orphan, or unnamed flags.
- Unit tests in `src/toolkit/gallery/logic/balance-tank-hall.test.ts` and `src/toolkit/gallery/logic/control-bus.test.ts` cover the 7 m hall height, the `control` medium on `tank.level-signal`, the orthogonal conduit route, and `controlBus('tank_hall')`.
