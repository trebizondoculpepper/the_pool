# Phone overlay framing and open PR reviews, 2026-11-06

The owner paused the fire repeater implementation and asked for it to be saved as mission 218. The new brief records a model-first dev2 Kentec-style repeater beside the main panel, linked to mission 053 and issue #26. No fire code or world version changed.

The owner then showed the raised phone's screen clipped by the bezel and identified FOV-dependent handset framing. The display plane had exactly the glass mesh's bounds (0.575 × 0.604 m), so it was inset to 0.53 × 0.55 m. The handset now scales and positions with the camera's perspective projection, keeping a fixed screen-space fraction through FOV and zoom changes; portrait layout uses the actual viewport shape because the game canvas is letterboxed to 4:3. A pure projection test checks FOV, zoom and portrait behaviour, and headless Chrome screenshots show the inset display on desktop and portrait views. The portrait phone remains small because the game canvas itself occupies only 292.5 px of a 390 × 844 page, recorded as a follow-up.

The owner asked for every open PR to be reviewed. Comments were posted on #46 (engineer's PC/chair interactions lost in shell-room migration, cue order, reach), #50 (gauge tapping alignment good), #58 (globe material change good), and draft #64 (CI still expects fixed 45.0 m³/h and convergence should be asserted). No PR files were edited.

Phone-focused tests, typecheck, lint, format check and build passed. The local full and fast suites reported failures in unrelated gas, air-handling, world and Jacuzzi tests while another agent's long Aqualis test occupied the same Mac; those suites were stopped after the failures. The phone tests and build remain green, and CI should be checked after the push.
