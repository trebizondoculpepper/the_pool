# 213: a phone to raise and lower

The owner, 2026-11-05. This is the first of three small phone missions. It delivers a Nokia-era 3D handset and the act of raising and lowering it. The screen remains black: [214](214-phone-menus-and-inbox.md) adds the interface and [215](215-phone-message-trial.md) sends scripted messages in a dev room. Authored fault scenarios follow later. See [the implementation plan](../plans/213-phone-model-and-raise.md).

## Gameplay reason

A handheld phone will bring the player reports and clues without stopping the plant. Its physical presence should make incoming messages feel like part of the world rather than a detached notification panel.

## Scope settled with the owner

- Find a decent, free-to-redistribute model of an early Nokia-style handset, check its exact licence, record author/source/required attribution in `CREDITS.md`, and include the licence and any adaptations with the asset. Prefer a compact game-ready model with a front screen area that can be replaced by 214's live display. Preserve the project's GPL distribution rights; do not assume that a free download permits redistribution. Remove or replace trademarks if required by the asset and branding review.
- Draw the handset close to the camera, facing the viewer like the phone presentation in GTA IV/V. Raise and lower it with **M** on keyboard, **D-pad Up** on gamepad and a touch phone icon, all through the one control scheme. The screen is a plain black placeholder and has no menus or message logic yet.
- The game world keeps simulating while the phone is raised. The phone captures the player's movement/use inputs while it is up; Escape lowers it before Escape can open the game menu. Opening the phone while carrying lowers the carried object out of view without dropping it. Closing the phone restores that object in normal carrying posture, including if it was being inspected.
- Keep the view readable on desktop, touch and gamepad. It is an in-view interface, not a world-placed phone, and requires no new dev room, save schema, inbox, or fault scenario in this mission.

## Candidate asset research, 2026-11-05

The owner chose and supplied the model on 2026-11-05: "Mobile phone" by Ilia_S (https://skfb.ly/oosCE, CC BY 4.0), its glTF package unchanged in `resources/models/phone/mobile-phone/` with `license.txt` (`4eacd515`), credited in `CREDITS.md` and recorded in `doc/reuse-inventory.md`. Use it; the candidate below is superseded. Its textures total about 25 MB and need shrinking for the build.

- Leading candidate: [KI NG's old Nokia low-poly phone](https://sketchfab.com/3d-models/old-nokia-phone-low-poly-a022864ae7b642a39469652c3eda2b9a), labelled downloadable under CC BY 4.0, about 6,600 triangles and 3,900 vertices. The page says it may be used freely with attribution. The official Sketchfab download API returned 401 without an authenticated account in this workspace, so the file and its screen topology have not yet been inspected. Do not treat the page preview as a verified import.
- Lightweight fallback: [sMoKi's Nokia 3310 LowPoly](https://sketchfab.com/3d-models/nokia-3310-lowpoly-bed87049026640a59f3f8b5844614253), labelled downloadable under CC BY 4.0, 144 triangles. Inspect it at phone-view size before choosing; it may be too simple for a close foreground prop.
- The [Nokia 6600 model by g1xsa](https://sketchfab.com/3d-models/nokia-6600-mobile-phone-df9535db6c714396997fa1402f87a64b) matches the Series 60 period but is not marked downloadable or licensed for reuse, so it is not currently a usable asset. The [3DModels.org Nokia 6600](https://3dmodels.org/3d-models/nokia-6600/) is a paid product and is outside this free-asset brief.

## Acceptance

The selected model is inspectable in the game, has a clear replaceable screen region and documented redistribution terms, and raises/lowers consistently on keyboard, gamepad and touch. The black screen stays black. The plant continues stepping, Escape prioritises closing the phone, and a carried object returns unchanged after closing it. Check the phone at the project's graphics quality settings and frame budget. Add no room-specific input handler.

## Records and dependencies

Before implementation, read `README.md` and the owner's project brief named in `AGENTS.md` (its Downloads path was unavailable in this workspace on 2026-11-05), then inspect the shared controls and viewport code. Update `TODO.md`, `CHANGELOG.md`, `CREDITS.md`, the controls guide and any asset provenance record. Run the repository checks before committing. 214 waits on this mission's screen and input surface.
