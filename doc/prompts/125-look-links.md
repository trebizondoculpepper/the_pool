# 125: Look links: put the camera on an object by URL

The owner, 2026-11-02: "when I ask you to show me a picture of a thing, it's usually quite difficult because it's a spatially difficult problem figuring out a camera angle". A link names a room and an object, and the game works out a view of it: `?room=boiler_house&look=BH-CP3&mode=front`. This is the first of three missions: this one jumps to an object; 126 lists each room's lookable objects in the dev panel; 127 makes everything lookable and audits it. Briefs only until the owner says go. Read `CLAUDE.md` and `src/toolkit/controls/CLAUDE.md` first. Reviewed by Codex 2026-11-02; its corrections are folded in.

## Why

Agents (and the owner) review the game by screenshot. Today a picture of one machine takes several tries: guessing `x`, `z`, `yaw`, `pitch` and `zoom`, finding the camera behind a pipe or facing the wrong wall, and the headless capture hanging while it retries. A look link makes a picture of a named thing one URL per angle, for a person in the browser and for a headless capture alike.

## What there is now (checked 2026-11-02)

- **Pose links:** `src/main.ts` (about line 1588) reads `x` and `z` (both needed), and optional `y`, `yaw` and `pitch` (degrees; yaw clockwise from north: 0 north, 90 east), `zoom` and `roll`, and places the player with `control.place`. `control.place` sets the position directly; collision applies only to the walking that follows (`src/toolkit/controls/input/first-person.ts`, about lines 1367 and 1764). `noclip=true` is a free camera. Ctrl/Cmd+P copies the present pose as a pin or camera link; Ctrl/Cmd+C copies the aimed object's reference (`inspectionReference`, `src/toolkit/controls/logic/inspection.ts`: its tag, or its name where it has none); Ctrl/Cmd+Shift+K copies a screenshot.
- **Clean capture:** mission 084's `captureView` (`src/main.ts`, about line 595) renders the room's canvases without the page's overlay, up to 3840 px wide and within the GPU's limits.
- **Identities already in the scene:** `markComponent` (`src/toolkit/components/core/views/component-identity.ts`), used by about 60 builders, marks a scene object with its `ComponentIdentity`: its `tag`, or a `name` for a thing with none; its `model` binding (a node, a fitting or a link); `decorative`; a `part` inside a component (a button, lamp or readout) with its own `key`. `owningComponent` walks up to the nearest marked owner; the inspection overlay and Ctrl/Cmd+C use it. `src/toolkit/gallery/views/world-in-model-scene.ts` already walks a scene's meshes to their owners.
- **The register:** `src/game/plant/installed-asset-ids.ts` gives placed equipment its permanent asset id and its explicit display tag, keyed `room|item.key|item.label` (for example `asset-1308`, `BH-CP3`). `room-equipment.ts` marks each placed object with that tag and, where the room has a schematic, its model node (about line 1730); the scene identity does not carry the asset id.
- **Facing:** exhibits and wall equipment are modelled facing their own +z and rotated into place (`room-equipment.ts` about line 1717; dev exhibits' holders in `rooms/plant-room.ts` about line 469, which may also tilt). Mission 117 already uses the same convention for carried things: inspecting one turns it to show its front, its own +z. So an object's front is its own +z carried into world space; where a kind breaks the rule, its identity states its front.

## Prior art (searched 2026-11-02)

Every editor has it by hand: Unity's and Unreal's Frame Selected (F), Blender's View Selected, which fit the camera to the selection's bounding box. Unity's Cinemachine Group Framing fits a group's bounds to a set share of the screen with limits on how far the camera may move in or out. three.js's `camera-controls` (yomotsu) has `fitToBox` and `fitToSphere` with padding, but users report it lines up with the world axes rather than the object's front, which our front convention avoids. Research on choosing the "best view" (Vázquez et al., viewpoint entropy; Polonsky et al.) scores views by how much of the object they show; we need only its simplest form, as a tie-break between candidate cameras when one is partly blocked. In the game itself, mission 117's `inspectionDistance` already fits a carried object to the view. Copy the fitting, which is solved; what is ours is the addressing, the line of sight in cramped plant rooms, and using it for review.

## The link

`?room=<room>&look=<ref>[&mode=<mode>][&fit=<fraction>][&shot=1]`

- **`look`, the ref:** anything Ctrl/Cmd+C copies is a ref, so aiming at a thing and copying it gives the link's ref. Resolved in this order, ignoring case: a tag (`BH-CP3`); an asset id (`asset-1308`, through the register to its tag); a model binding (`node:<id>`, `fitting:<id>`, `link:<id>`); a name (`Boiler cascade manager`, or its slug `boiler-cascade-manager`). A part follows a slash: `BH-CP3/display`, matched against the parts' labels or keys. What Ctrl/Cmd+C copies for a part (its own `key`, or `part:<label>`, `src/game/plant/component-inspection.ts` about line 59) is accepted too, resolved within the room; a `part:<label>` shared by several components is ambiguous like a repeated name.
- **One target, several pieces:** every marked owner in a room with the same tag, or the same model binding, is one target, its bounds the union of theirs (a pipe and its markings under one link, a machine built in pieces). 127 relies on this rule.
- **Unique or refused:** a tag, asset id or model binding names one target in a room (by the rule above). A name that matches separate targets (different tags or bindings, or none) is refused with the list of matches, each with its own unambiguous ref (`…#2`, the second by scene order), never guessed. A ref in the register whose room is built but holds no object marked with its tag says "not in the scene".
- **`room`:** if missing and the ref is a tag or asset id in the register, the register's room.
- **`mode`:**
  - `front` (the default): on the line out from the object's front through its centre, at the distance that fits its bounds in the frame;
  - `left` and `right`: the same distance, swung 35° either way, to show depth;
  - `room`: from the room's centre at eye height, turned to the object, zoomed to fit (the owner's simplest mode);
  - `detail`: `front` on a part, close (needs a part in the ref);
  - `above`: from above and in front, pitched down 45°, for things on the floor or a desk.
- **`fit`:** the share of the frame the object fills, default 0.8.
- **`shot=1`:** hide the page's own UI (HUD, the room's caption, the movement buttons), so a browser screenshot of the page is clean. `captureView` needs no flag: it already leaves the overlay out.

## How the view is chosen

1. **Find:** once the room says it is settled (below), walk its scene for marked owners whose identity matches the ref (one walk per request; nothing per frame). The target is the owner and everything under it; its bounds are their world bounding box. Its front is its own +z in world space, flattened to the floor plane unless it faces up (a desk screen).
2. **Candidates** (pure): for the asked mode, a camera on the front line at the fit distance (the box's projected extent fills `fit` of the frame in its tighter dimension and no more than `fit` in the other, for the field of view and the window's aspect), then fallbacks in a fixed order: up to 1 m left and right, lower and higher within the eye range, the `left` and `right` swings, nearer with a wider view. Eye height between 1.0 and 2.2 m; reach a far or high object with `zoom`, within the controls' zoom and pitch limits, rather than by flying.
3. **Walkable:** each candidate is tested against the room's own walk collision (`src/toolkit/controls/logic/walk-collision.ts`: its footprints at the player's level, and the walker's radius). One that would stand inside a solid, outside the room or off its floor is dropped. A candidate pulled nearer than its fit distance widens `zoom` rather than cropping.
4. **Line of sight:** for each surviving candidate, nine rays (the box's centre and its corners) are cast in the room's own scene. Blockers are opaque visible meshes that are not the target or under it; invisible meshes, transparent ones (opacity under 0.5), the services ceiling and effects do not block. Take the first candidate that sees at least 8 of 9; otherwise the one that sees most, nearest the asked mode on a tie, with a warning.
5. **No walking candidate:** fall back to the free camera (`noclip`) at the asked mode's position, and say so.
6. **Place** the player with the ordinary `control.place`, so the result is an ordinary pose that walking can leave.

The candidate generation, fitting, zoom and ranking are a pure module (`src/toolkit/gallery/logic/look-camera.ts`, tested beside it): the box, front, room rectangle, field of view and limits in, the ordered candidates out, and the choice made from the walkability and ray results handed back to it. Finding the object, testing collision and casting rays are in `views/`, in the target room's scene and frame. **What a room must offer:** `RoomHandle` (`src/main.ts` about line 162) today exposes neither its scene nor whether it has finished building, and dev rooms load their exhibits asynchronously (`rooms/plant-room.ts` about line 740). Add to it an optional `look` hook: the room's scene (the root to search and cast rays in) and a `settled` promise that resolves once everything the room builds, exhibits included, is in the scene. Rooms without the hook answer "no lookable objects in this room yet". Dry peeks, open doorways into other rooms and the pool loop's corridor hand-offs are out of scope: a look works in the room it names.

## What it tells you

- **In the page:** a short notice of what it looked at, the mode and the rays seen ("BH-CP3 · front · 9/9 seen"), or why it could not ("no 'BH-CP9' in boiler_house; nearest: BH-CP3, BH-MP2"; "'Valve' matches 4 objects: …#1 … #4"; "B-501 is in the register but not marked in this room's scene (mission 127)"; "no lookable objects in this room yet").
- **For scripts:** `window.__poolLook` holds the result: `{ ref, room, found, mode, pose: {x, y, z, yaw, pitch, zoom, noclip}, seen, candidates, warnings, ready }`. `ready` turns true once the room is settled, the target found, the camera placed and two frames rendered from it, so a capture waits for `ready`, not for the object alone.
- **A plain link:** the notice offers the resulting pose as an ordinary `x`/`z`/`yaw`/`pitch`/`zoom` link, which stays the same if the look rules later change.
- **A console command:** `look <ref> [mode]` in the room the player is in.

## A capture script

`npm run look -- <room> <ref> [modes]` (in `scripts/`, Node with the headless Chrome already used for checks): opens each look link with `shot=1` on the local dev server, waits for `window.__poolLook.ready`, saves one PNG per mode to an ignored folder, and prints each file with its result. It closes Chrome and exits on a timeout rather than hanging. This is the tool agents use to answer "show me".

## Acceptance

- **Resolves and frames,** in the browser, with screenshots in the plan: BH-CP3 and BH-MP2 in the boiler house (the pipe in front of BH-MP2 is the line-of-sight case); the weather station console in dev0 and in the control room (by its tag); B-501 from `above`; the CM6 display or a CM6 key in `detail`; an exhibit in dev39 by its name.
- **Says why not:** an unknown ref, an ambiguous name, a register ref not in the scene, a room with nothing marked.
- **Deterministic:** the same link gives the same pose twice.
- **Pure tests:** the box fills `fit` in its tighter dimension and no more in the other; candidates stay inside the room rectangle; the pitch aims at the centre; `left` and `right` are symmetric; ranking takes the asked mode on a tie; a clamp widens `zoom`. Ref parsing: tag, asset id, model refs, names and slugs, parts, `#n`, case, the inferred room.
- **The capture script** writes the PNGs above in one run.

## Not in this mission

No world state (no `WORLD_VERSION`); no new marking of objects beyond what exists, except the named parts the acceptance needs (127 does the rest); no list in the dev panel (126). Look links work in every build, as pose links do, and change nothing saved.

## Records

The plan in `doc/plans/125-look-links.md`, with the camera rules' figures and the acceptance screenshots; the CHANGELOG under Unreleased (`### Added`); `TODO.md`: this mission; `README.md` and the dev panel's header: the link's form, so agents find it.
