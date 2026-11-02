# 138: The simulation graph audit

The owner, 2026-11-02: one more kind of audit before the audit itself (132) begins. Brief only; not started until the owner says. The plan is `doc/plans/138-simulation-graph-audit.md`. Read `CLAUDE.md`, `doc/plant-model.md`, then 126, 127, 129, 130 and 131.

## What it is for

From any node of the simulation, find out what it does in the world: which objects in the game are bound to it, what feeds it and what it feeds, and whether it has any direct or indirect effect on something the player can see or work. Switching off the main power, for example, probably governs some nine in ten of the machines in the game; opening a door probably governs nothing but the door's own model. The audit makes that visible, node by node, so a dead node (simulated but never seen), a misbound object or an unexpected dependency shows itself.

## The nodes

The simulation's graph as the code already has it: the plant model's blocks within blocks, each addressed by path (`src/game/sim/blocks.ts`, `doc/plant-model.md`: `boilerHouse/B-501/controller`, a field after `:`), each room's enhanced network (nodes, fittings and links of the schematics, as the plumber builds them), and the electrical supply (`src/game/plant/electrical.ts`, `services.ts`, `installed-feeders.ts`: feeders, isolators, distribution). **In scope (the owner, 2026-11-02): every domain of the simulation:** electrical (feeders, isolators, distribution, motors and loads), heating (the boilers and their cascade, the LTHW ring, heat exchangers, each consumer's heat demand), hydrodynamic (pumps, pipes, valves, filters, tanks, flows and levels) chemical (dosing, stores, day tanks, the water's chemistry and the air's), and control and warning systems (controllers, sequencers, programmes and interlocks; sensors and their signals; alarms, annunciators, lamps and the control rooms' copies of them). They join wherever one domain drives another (a pump's motor is a load on a feeder and moves water; a boiler burns gas and heats the ring; a dosing pump moves chemical into a circuit), and the pages show those joins. The plan settles how each domain's graph is read from the code and how the joins are found, not invented; world state outside the four domains (lights, the bridge's displays, the CONTROL ROOM MODE knob) appears as leaf nodes. Architectural objects (doors, signs) are outside the graph and get an architectural object page saying they are not simulated (the owner, 2026-11-02; plan section 2a).

## The page: seven sections (the owner, 2026-11-02)

A development page per node, reached from the model node column of the room audit (129) and the item audit (130), and from a new **Simulation** category in the `?dev` catalogue (126) that lists the nodes by domain, room and path, searchable, with a `bench.html` route like the other audits. This is the simulation's own view, a development tool, and says so: the no-peeking rule does not apply. Each node's page has seven sections:

1. **What is it:** its path, domain, kind, room, tag, derived name and description, and the maker of the object bound to it.
2. **How does it connect:** its ports (`doc/plant-model.md`: a block shows the world only its ports), each with its direction and medium (water, heat, power, chemical, signal, alarm) and what it joins on the far side, each a link to that node's page; the passive connectors between (pipes, cables) collapse into the edge, with a "show connectors" switch, and have no page of their own (plan sections 2 and 2a).
3. **What state does it hold:** each field with its type, units, range or possible values where known, its normal state from the schematic, its current value in a fresh world, and whether it is saved in the world.
4. **What makes it change:** what drives its state (its inputs, physics, a controller, a control), whether instantly or over time, the faults and trips it models (the status-words rule: On/Off unless faults are modelled), and the event-log lines it produces.
5. **What is it related to:** its direct upstream and downstream only, the controls acting on it, the sensors reading it, and the alarms it can raise and on which annunciators.
6. **Where does it appear in the world:** its bound objects and every other representation, each linking to that object's audit row (129, 130), the displays, lamps and mimics showing it in its own room and in both control rooms, and whether the player can see it and act on it.
7. **Is anything wrong with it:** flags for invisible (simulated, nothing shows it), uncontrollable (its kind should be workable but nothing acts on it), no effect (nothing downstream), no source (nothing upstream), an alarm not on both control rooms (every warning shows on the old control room and the bridge), and a missing or duplicate tag.

## The impact search: a later mission

Deferred by the owner (2026-11-02), as potentially very large: a search from a node along the graph, downstream and upstream, through every edge kind, listing every object in the world the node can affect directly or indirectly, with the path by which each is reached (the main supply reaching most of the plant, a door only itself). This mission leaves a clean hook for it (the graph's direct-neighbour function and edges carrying their medium and evidence) and builds no walk and records no counts.

## Shared with the rest

Reuses 126's catalogue, 127's scene marks, 129's connection graph (its drawn / model only / boundary labels) and 131's descriptors; the graph (its nodes, edges and direct neighbours) is one pure module in `logic/`, tested, which 129's connections column and 134's `plant-connections.ts` could also use. Built from data, not by building scenes, except where a binding is only known from a scene (then by 127's scanner, one room at a time, on demand).

## Scope

Machinery only (the owner's standing rule for the audits): prove it on a few nodes, for example a Jacuzzi plant room valve, the Jacuzzi cabinet's pump, the main incoming supply, an alarm and its annunciator point, and a door as an architectural object. No whole-game run, no counts recorded; the audit itself is 132's.

## Acceptance

- Each example node (a Jacuzzi plant room valve, the Jacuzzi cabinet's pump, the main incoming supply, an alarm point) has a page with all seven sections, every active neighbour, control and alarm a link to its own page, every connector ref resolving to its run's section on an active node's page, and every representation a link to its object's audit row.
- A plant door has an architectural object page (plan section 2a's route) saying it is not simulated, with no node and no edges; the alarm's page shows whether it reaches both control rooms.
- Pure parts (the graph, the joins between domains, the direct neighbours, the sections' data, the flags) in `logic/` with tests beside them; the impact search's hook in place, unimplemented.

## Records

The plan in `doc/plans/138-simulation-graph-audit.md`; `TODO.md`; `CHANGELOG.md` under Unreleased once built; `doc/agent-tooling.md` when it lands; a diary entry.
