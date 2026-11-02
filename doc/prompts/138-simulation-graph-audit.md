# 138: The simulation graph audit

The owner, 2026-11-02: one more kind of audit before the audit itself (132) begins. Brief only; not started until the owner says. Read `CLAUDE.md`, `doc/plant-model.md`, then 126, 127, 129, 130 and 131.

## What it is for

From any node of the simulation, find out what it does in the world: which objects in the game are bound to it, what feeds it and what it feeds, and whether it has any direct or indirect effect on something the player can see or work. Switching off the main power, for example, probably governs some nine in ten of the machines in the game; opening a door probably governs nothing but the door's own model. The audit makes that visible, node by node, so a dead node (simulated but never seen), a misbound object or an unexpected dependency shows itself.

## The nodes

The simulation's graph as the code already has it: the plant model's blocks within blocks, each addressed by path (`src/game/sim/blocks.ts`, `doc/plant-model.md`: `boilerHouse/B-501/controller`, a field after `:`), each room's enhanced network (nodes, fittings and links of the schematics, as the plumber builds them), and the electrical supply (`src/game/plant/electrical.ts`, `services.ts`, `installed-feeders.ts`: feeders, isolators, distribution). Settle in the plan exactly which graphs count as "the simulation graph" and how they join (a pump's motor in the water network is a load on a feeder in the electrical one), and how parts of the world state outside them (the bridge's displays, doors, lights) appear: as nodes of their own, or as leaves.

## The page, simple version (first)

A development page per node, reached from the model node column of the room audit (129) and the item audit (130), and from a new **Simulation** category in the `?dev` catalogue (126) that lists the nodes by graph and path, searchable. For each node, what can be read directly from the node:

- **What it is:** its path, its kind (block, fitting, link, feeder…), its room, its tag where it has one, and its state fields with their current values in a fresh world (the no-peeking rule does not apply here: this is the simulation's own view, a development tool, and says so).
- **Bound to:** every object in the game world bound to it (by its model binding in the scene marks, the register, and 131's descriptors), each with its look link (125), its room audit row (129) and its item audit (130).
- **Upstream:** the nodes that feed it directly (its inputs through its ports, its supply, its controller, the controls whose world actions set it, per 131's `targets`), each a link to its own page.
- **Downstream:** the nodes it feeds directly, each a link.
- **Controlled by:** the controls in the world that act on it, with where they are.

## The impact search, later version (second)

A search from the node along the graph, downstream (and, as a separate view, upstream), through every edge kind (water, heat, power, signal, control), that lists every object in the world the node can potentially affect, directly or indirectly: by room, by kind, with counts and the path by which each is reached (so "why does the main power reach this gauge?" has an answer). Its result for the main incoming supply should be most of the plant; for a door, just the door. It shows what fraction of the world's bound objects a node reaches, and can be sorted to find the nodes with the widest and narrowest reach, and nodes that reach nothing in the world at all.

## Shared with the rest

Reuses 126's catalogue, 127's scene marks, 129's connection graph (its drawn / model only / boundary labels) and 131's descriptors; the graph walk is one pure module in `logic/`, tested, which 129's "connects to" column and 134's plant-wide diagnostics could also use. Built from data, not by building scenes, except where a binding is only known from a scene (then by 127's scanner, one room at a time, on demand).

## Scope

Machinery only (the owner's standing rule for the audits): prove it on a few nodes, for example a Jacuzzi plant room valve, the Jacuzzi cabinet's pump, the main incoming supply (for the impact search) and a door. No whole-game run, no counts recorded; the audit itself is 132's.

## Acceptance

- Simple version: each of the example nodes has a page listing its bindings, its direct upstream and downstream, and its controls, all as links that lead to each other's pages and to the world objects.
- Impact search: the main supply reaches most of the plant's bound objects, a Jacuzzi valve reaches the Jacuzzi's circuit and its displays, a door reaches only itself, each with the path shown.
- Pure parts (the graph join, the direct neighbours, the walk) in `logic/` with tests beside them.

## Records

The plan in `doc/plans/138-simulation-graph-audit.md`; `TODO.md`; `CHANGELOG.md` under Unreleased once built; `doc/agent-tooling.md` when it lands; a diary entry.
