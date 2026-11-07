# Handheld phone motion, 2026-11-07

Issue #81 follows the owner's request that the 3D phone feel held rather than fixed to the camera. The phone keeps its existing framing and raise/lower animation; a small, deterministic pose now offsets and rotates the shared handset anchor. Because the display and its hit surfaces are children of that anchor, they move together. Walking distance drives a smoothed activity value, while idle drift continues at low frequency. The system and game reduced-motion preferences remove the drift and sway.

The first cut is deliberately restrained: idle translation is a few millimetres and rotation stays below half a degree. Focused tests bound the pose, check frame-rate-independent walking response, and check the steady reduced-motion pose. Browser review still needs to confirm legibility and touch accuracy after the colour-matrix display from #77 lands.
