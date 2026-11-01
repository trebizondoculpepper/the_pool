# 2026-11-01: CO₂ into Plants 1 and 2

The owner narrowed mission 118 to a working low-pressure CO₂ path: a shared supply in the world, a Trio-controlled valve in each of Plants 1 and 2, and a modelled pipe into the correct water injection port. The experiment on long-term acid use waits for the independent CO₂-loss correction, and possible abuse or fault play is later work.

I connected the existing pure CO₂ plant logic to world state, saved it as version 66, connected each Trio's CO₂ feedback and demand, and passed delivered grams through the treatment circuit's `Additions.co2`. The room schematics now contain the building branch, wall port, isolation and dosing valves, and injection nozzle. The scene draws copper runs and a live dosing panel for each room; the loading bay's existing cylinder cage follows the world state.

The project-agent pickup and completion notices follow the new `AGENTS.md` workflow. The shared checkout also needed `.claude/worktrees` excluded from local test discovery so other agents' worktrees do not enter the main checkout's checks.
