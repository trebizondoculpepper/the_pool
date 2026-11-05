# 213: phone model and raise/lower plan

The [mission brief](../prompts/213-phone-model-and-raise.md) gives the owner-approved first scope: model, controls, black screen and carried-item handoff only. Do not build 214's menus or 215's delivery as part of this work.

## Asset selection and provenance

The owner chose and supplied the model on 2026-11-05: "Mobile phone" by Ilia_S (https://skfb.ly/oosCE, CC BY 4.0), its glTF package unchanged in `resources/models/phone/mobile-phone/` with `license.txt` (`4eacd515`), credited in `CREDITS.md` and recorded in `doc/reuse-inventory.md`. Use it; the candidate below is superseded. Its textures total about 25 MB and need shrinking for the build.

Prefer a downloaded, licensed asset with a useful front silhouette and separable screen. The leading candidate is [KI NG's CC BY 4.0 old Nokia model](https://sketchfab.com/3d-models/old-nokia-phone-low-poly-a022864ae7b642a39469652c3eda2b9a), about 6,600 triangles. Its page marks it downloadable, but Sketchfab's official API requires authentication in this workspace; inspect the actual downloaded source before selecting it. Check its mesh, texture dimensions, screen geometry and transform in a local viewer; optimise only as needed for a close in-view prop and the game's quality settings. Keep the asset's copyright notice, attribution link and adaptation notes with it and in `CREDITS.md`. If a candidate cannot be redistributed or has an unusable front screen, do not import it; try the documented fallback or another licensed model.

## Rendering and controls

Load the chosen model once, attach its presentation transform to the camera/view layer, and reserve a simple dark screen surface that 214 can replace. Use one shared phone-open state, not a room condition. In `src/toolkit/controls/`, add M, gamepad D-pad Up and touch phone icon to the control table and input implementation. Raising it captures world movement/use, but the world simulation continues. Escape lowers it first; the next Escape can open the game menu. An item already in hand moves out of view while the phone is raised and returns in normal carrying posture when it closes; retain the exact held object and its world state. Keep this first pass free of phone menus, sounds and message storage.

## Verification

Inspect the asset at the actual phone-view size, including touch portrait and landscape layouts. Exercise toggle and Escape on keyboard, gamepad and touch; test the held-item handoff and confirm the world still steps. Check that phone opening does not duplicate the model or leak resources, and that its screen is plain black. Run the repository checks, then commit only this mission's changes and notify the other agents that 214 can start.
