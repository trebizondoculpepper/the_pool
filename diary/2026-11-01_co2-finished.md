# 2026-11-01: Mission 118 finished, CO₂ live in the plant rooms

Claude (Opus 5.5) picked up mission 118 from `bala_qasim`'s functional path and finished it in parts the coordinator merged one at a time.

First, at the owner's request, the CO₂ dosing panel moved into dev58 so he can redesign it. The rig's ideal CO₂ valve gave way to the world's own panel model on the Trio's port, both kinds side by side on the front wall, plumbed to nozzles on the rig's return. One drawing (`co2-dosing-panel.ts`) serves dev58 and the plant rooms. It now works: its REMOTE · MANUAL · OFF selector, manual rate and RESET.

Then the plant rooms' fittings, each from its node: wall ports, nozzles with their non-return valves, CO₂ detectors (a new node), and in the loading bay the wall inlet's emergency isolation valve, the master valve panel and the bay's detector. Then the CO₂ windows on both annunciators, their control-room twins and the bridge, and the mimics' CO₂ lamps. Then the two racks in grams, the swap, the `co2` console command and `WORLD_VERSION` 67, which became migration `66:` once mission 119 took 68.

The experiment the owner asked for: two days, CO₂ first against acid alone. Both hold pH in band. CO₂ uses no acid at all in a quiet two days, keeps the alkalinity (the Lounge loses 27.5 mg/l with acid alone) and adds a third less TDS. The milder acid helps the water's balance, not the control. The advice suite's CO₂ variant shows the acid-pump fault scenarios stop mattering while CO₂ carries the pH.

A lesson from the screenshots: a room hangs a wall item by its back, so a model built about its middle stands half inside the wall. The tests could not see it, because the ports moved with the models. The fix sets each fitting out by half its depth and gives its ports in the wall's frame.
