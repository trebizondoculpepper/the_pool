# Mission 202 — bodies of water (2026-11-05)

The owner picked up the parked water-body discussion brief and asked for design review with other agents before implementation. I asked Ahnaa, Nicole, Sayuri and Farhad. Ahnaa reviewed scene units, floor queries, edge guards and ladder mounting; Nicole reviewed trait support, drained basins and live-level caching. The plan is in `doc/plans/202-bodies-of-water.md`.

The pool and footbath basins and the Jacuzzi now have registered water-body kinds and explicit hall bindings; the bench catalogue and room audit discover their installed copies. A shared movement rule uses the local basin floor and the water plane already driving the visual mesh: at up to 1.2 m depth the walker wades at 0.9 m/s; in deeper water it swims at 0.8 m/s with its eye just above the surface. A shallow wader leaves by an edge; a deep swimmer uses a ladder or steps. A pool ladder mounts from the water surface rather than pulling the swimmer down to the basin floor. A drained or partly drained deep basin blocks an unsafe deck drop. The Jacuzzi's raised tub keeps its own floor and live stepped water level.

The browser check used a scratch save slot. Pool 02's swimmer ended at y ≈ 0.10 m, stopped at the deep edge, and climbed out with the ladder; without using the ladder it stayed inside. The footbath and Jacuzzi allowed shallow exits. A drained Olympic pool blocked a 2 m deck drop. Targeted tests, typecheck, registry check, lint, format check and build passed. The full test run passed 703 files and 5,900 tests, with 74 expected failures and 12 skipped files.

Higher falls into water, wet footsteps or drips, and underwater view and sound remain design follow-ups. Mission 203 owns the rendering; this mission leaves the existing one-metre drop limit in force.
