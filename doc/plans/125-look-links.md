# 125: Look links (plan and record)

Brief: [doc/prompts/125-look-links.md](../prompts/125-look-links.md). The owner said go on 2026-11-02. Implemented in one stage.

## The link

`?room=<room>&look=<ref>[&mode=<mode>][&fit=<fraction>][&shot=1]`

- **The ref** (`src/toolkit/gallery/logic/look-ref.ts`, pure, tested): case ignored; in order a register ref (an asset id, or a tag in `INSTALLED_ASSET_IDS`, through to its tag), a model binding (`node:`, `fitting:`, `link:`), a tag not in the register, a name or its slug, then a part's own key or `part:<label>` alone. A part follows a slash (`BH-CP3/cm6-home-key`, matched against its label, the label's slug or its key). `#n` picks the nth of a repeated name by scene order. Owners sharing a tag or a model binding are one target, their bounds united. A named owner inside another owner of the same name is part of it (dev39's mimics name their pieces alike).
- **Refusals:** unknown (`no 'BH-CP9' in boiler_house; nearest: BH-CP1, BH-CP2, BH-CP3`, by edit distance); ambiguous (`'Valve' matches 4 objects: valve#1, …`, tagged or bound matches by their own ref); a register ref in its room but unmarked (`… is in the register but not marked in <room>'s scene (mission 127)`); a register ref in another room (`… is in control_room, not boiler_house`); a part not found (listing the object's parts); a room without the hook or with no marked owners (`no lookable objects in dev7 yet`); a ref without `room` not in the register.
- **`room`** left out: the register's room for a tag or asset id, written into the address.

## Camera rules (`src/toolkit/gallery/logic/look-camera.ts`, pure, tested)

- **Fitting:** from an eye, the needed tangent of the vertical half-angle is the largest over the box's eight corners of the vertical offset over depth, and of the horizontal over depth divided by the aspect, all over `fit`. The fit distance along a direction is found by halving (60 steps) until that equals the field of view's; any candidate's zoom is the field of view over the angle it needs, within 0.65 to 4. So a candidate pulled nearer widens the zoom, and a small part seen from the nearest allowed distance (0.35 m) zooms in.
- **Front:** the owner's own +z in the world, flattened to the floor unless within about 20° of straight up.
- **Candidates, in order:** the asked mode's line at the fit distance; 0.5 and 1 m to either side; eye 1.2 and 2.0 m; the `left` and `right` swings (35°); 0.7 and 0.5 of the distance. `room` begins with the room's middle at 1.7 m. `above` keeps its 45° within the eye's range, moving out or in. Every candidate is kept inside the room's envelope less the walker's radius (pulled in along its line to the centre) with its eye 1.0 to 2.2 m above the floor the target stands on (a room of several levels, such as the Jacuzzi plant room's deck over its floor, asks `floorAt` under the target), and aimed at the box's centre (pitch within ±1.45).
- **Choice:** the first walkable candidate whose nine rays see at least 8; else the walkable one that sees most, earliest on a tie, with a warning; with none walkable, the first in noclip, saying so.

## In the scene (`src/toolkit/gallery/views/look-scene.ts`)

One walk of the scene for marked, non-decorative owners. Walkable: not overlapping the room's solid footprints (open doorways cut through) at the walker's radius, inside the envelope. Rays: from the eye to the box's centre and its corners drawn in to 90%; a hit blocks if it is a visible mesh with an opaque material (opacity at least 0.5), not under the target and not under the `Services ceiling` group.

## What a room offers

`RoomHandle.look = { settled }` (`src/main.ts`): the shell rooms (boiler house, control room and the rest), the pool plant rooms (`plant-room-shell-room.ts`), dev0 (`controls-room.ts`) and every exhibit room (`plant-room.ts`, settled once its exhibits are built). The scene, solids, envelope, floor and field of view come from the controller's read-only `lookSurface()` (`first-person.ts`). Other rooms answer "no lookable objects in <room> yet". New marks: each dev room's exhibit holder is named by its title unless the exhibit marks itself; dev0's weather station console is named. dev0's inspector still prefers its own naming of controls over that mark (`inspect-pick.ts`).

## Results

`window.__poolLook = { ref, room, found, mode, pose: {x, y, z, yaw, pitch, zoom, noclip}, seen, box, candidates, warnings, reason, link, ready, done }`: pose in metres and degrees; `ready` once placed and two frames drawn; `done` when finished, found or not. The page shows a notice (`BH-CP3 · front · 9/9 seen · pose link`), or the refusal for 20 s; `shot=1` hides the HUD, the room's caption, the crosshair and the movement buttons (and the success notice). Console: `look <ref> [mode]` in the present room.

`node scripts/look.ts <room|-> <ref> [mode,mode…]` (headless Chrome, the running dev server, never started by it) saves `doc/marketing/tmp/look/<room>_<ref>_<mode>.png` and prints each result and its pose link; it exits non-zero on a refusal or a timeout (60 s a shot). `npm run look` is not added: `package.json` is staged only for dependency changes and releases, so the alias waits for the owner (TODO).

## Acceptance (2026-11-02, captured with the script at 1600 × 900, shown here reduced)

| Link                                                      | Result                                                                                                                                |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `?room=boiler_house&look=BH-CP3`                          | 9/9, [front](125/boiler_house_BH-CP3_front.jpg), [left](125/boiler_house_BH-CP3_left.jpg), [right](125/boiler_house_BH-CP3_right.jpg) |
| `?room=boiler_house&look=BH-MP2`                          | 9/9, [front](125/boiler_house_BH-MP2_front.jpg), clear of the riser beside it                                                         |
| `?room=boiler_house&look=B-501&mode=above`                | 9/9, [above](125/boiler_house_B-501_above.jpg), eye at 2.2 m, zoom 0.65                                                               |
| `?room=boiler_house&look=BH-CP3/cm6-home-key&mode=detail` | 9/9, [detail](125/boiler_house_BH-CP3_cm6-home-key_detail.jpg), zoom 4 (the CM6 display is not yet a named part: 127)                 |
| `?look=CR-CP10` (room inferred)                           | 9/9, [front](125/control_room_CR-CP10_front.jpg); `?look=asset-1307&mode=left` the same console from the left                         |
| `?room=dev0&look=weather-station-console`                 | 9/9, [front](125/dev0_weather-station-console_front.jpg)                                                                              |
| `?room=dev39&look=heat-energy-mimic`                      | 9/9, [front](125/dev39_heat-energy-mimic_front.jpg)                                                                                   |
| `?look=PL3-CAB1&shot=1`                                   | 8/9 from the plant floor, a riser across one corner                                                                                   |
| `?room=boiler_house&look=BH-CP9`                          | refused: nearest BH-CP1, BH-CP2, BH-CP3                                                                                               |
| `?room=dev39&look=mimic`                                  | refused: nearest Mimic LED chaser, Heat energy mimic, …                                                                               |
| `?room=dev7&look=x`                                       | refused: no lookable objects in dev7 yet                                                                                              |
| `?look=B-501`                                             | refused: not in the register, give its room                                                                                           |

Deterministic: the same link in the same window gives the same pose (BH-CP3 twice: x −1.7500, z 5.7446, yaw 180). A different window shape gives a different fit distance, as it should.
