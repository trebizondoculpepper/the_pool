# 224: Subtle handheld motion for the raised phone

Tracked in [issue #81](https://github.com/trebizondoculpepper/the_pool/issues/81); status lives there. The owner, 2026-11-07, wants the 3D handset to feel held in front of the player's face rather than rigidly pinned to the screen. It should drift and rotate very slowly, with a small response to walking, while remaining readable and touchable.

## Gameplay reason

The phone is a physical object in the player's hand. A restrained movement cue makes that clear without making the small screen difficult to read or causing a touch to miss a key.

## Work

1. Add a pure, deterministic pose helper for tiny translation and rotation on all three axes. Use smooth low-frequency motion with no per-frame randomness or accumulating drift. Start from the existing `phoneFraming` pose and preserve its size, lift and viewport rules. Tune from a browser visual check: idle translation should stay within a few millimetres and idle rotation within roughly half a degree; walking may add a little sway but should settle promptly when motion stops.
2. Apply the pose to the same handset anchor that owns its display and hit targets. Both rendered phone and resolver/click/touch geometry must move together; update its world matrix before resolving an aim. Do not animate the display texture to create the effect.
3. Keep mouse look and WASD independent of the sway. A stationary phone target should remain practical to click with the crosshair, and a touch press should continue to activate the target captured when the finger went down even if the phone moves a little before release.
4. Respect the user's reduced-motion preference, including `prefers-reduced-motion`, by removing idle drift and walking sway while leaving the normal raise/lower action usable. Do not add a new persistent setting or world-state migration for this effect.
5. Add focused tests for bounded motion, frame-rate independence, settling and reduced motion. Verify desktop and portrait readability, touch alignment, walking sway and shimmer in a browser with the colour-matrix display from #77.

## Acceptance

- The raised handset has subtle, continuous physical movement at rest and a gentle extra sway while walking. It never visibly jumps, wanders away from its framed position or obstructs the player's view more than the current phone.
- Screen text remains legible and the pixel grid does not shimmer distractingly. Handset buttons and screen rows stay aligned with mouse and touch hit targets throughout the motion.
- Reduced-motion preference holds the handset steady in its normal framed pose; lowering and raising still work.

## Dependencies and coordination

Implementation waits for #76's common handset resolver and #77's 128 × 128 display to merge. It changes `phone-view.ts` and a pure logic helper beside the framing code; #78's menu changes may be tested with it but do not need to be coupled. The phone uses no new world state.
