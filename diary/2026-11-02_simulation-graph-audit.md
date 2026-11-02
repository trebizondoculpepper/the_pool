# Development Diary Entry - 2026-11-02

## Context

- **Date**: 2026-11-02
- **Branch**: main
- **Commit**: `138: simulation graph audit`
- **Contributors**: Claude Code + the owner

## Problem Statement

Mission 138: a development page per simulation node, saying what it is, how it connects, what state it holds, what changes it, what it is related to, where it appears in the world and whether anything is wrong with it, proved on four example nodes and a plant door, machinery only (no whole-game run, no counts).

## Our Approach

Followed the plan (`doc/plans/138-simulation-graph-audit.md`) as the contract: one id scheme `<room>/<sort>:<id>`, the rooms' enhanced networks read with 129's own segment walk (`alongOf`, now exported), passive pieces collapsed into connector runs, tiers declared per kind, and the joins, alarms and parts only as declared tables, each edge with its provenance and each table entry probed by a test.

## Implementation

`src/toolkit/gallery/logic/sim-graph/` (graph, tiers, coverage, state adapters, drivers, flags, node page, part ports, annunciator controls, sources for schematics, parts, joins, alarms, leaves and relations), with tests beside them; `views/sim-node-page.ts` (the node page, the list and the architectural object page); routes in `src/bench.ts`; a Simulation tab in the `?dev` catalogue; model-node links and a not-simulated link in the room audit.

## Outcomes

- Parity held: the graph's segment neighbours equal 129's `connectionsOf` for every node and fitting of the Jacuzzi room, and its base links equal 134's `plantConnectionsFor` for the Jacuzzi cabinet and P-101A (the Olympic annex's links, which 134 does not read, set apart), valve tags included.
- The catalogue's look entries carry no model refs for the Jacuzzi room, so bound objects are matched by the derived tag as well.
- The bench file was rewritten by mission 137 while this ran; the three routes went back in as their own hunk, committed through a private index.
- Every test passed on its first run except the 134 parity, which found the annex difference.

## Next Steps

The follow-ups in `TODO.md`: the chemical join, more declared data (alarm sources, location boards, adapters, parts), and routing 129 and 134 through the shared walk; then the reverse links and the edges report, already listed.
