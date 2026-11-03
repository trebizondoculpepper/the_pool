# 145: Bench search opens an instance detail page

The owner, 2026-11-02: searching `bench.html` for “temperature” finds `PL2-TC1 · Olympic pool pool water temperature controller`, but its main link jumps into the room. The main link should open a page describing that particular object: which visual model draws it, which simulation graph nodes represent it, and what its current status is. Keep the look views as explicit secondary links. Do this mission before resuming mission 144.

## Scope

- Give each room-object row in the bench tree a stable, relative, shareable instance-detail URL keyed by room and ref. The copies listed under Things should use the same destination; keep Enter the room, look modes and audit links available separately.
- Say where the instance is (room and a room-entry link) and what contains it, using an explicit catalogue parent or graph containment relationship where one exists.
- Identify the exact placed visual item key/variant where the catalogue knows it, and link to the kind's item audit and available visual inspection routes. Do not claim a magic-room model exists when there is no adapter.
- Resolve the object's actual model binding to simulation graph nodes, link each node's page, and distinguish a missing or unresolved binding from an object outside the executing graph. Show contained or related nodes only with their relationship named.
- Identify known behaviour models from graph state adapters and declared drivers, linking to the correct node page for details. Do not infer an implementation from an object's name.
- Read live world state from the selected save slot without changing it. Show the object's current condition and graph-backed state fields with units and a simulation timestamp; identify absent status coverage explicitly. Keep the page current as the world advances.
- Handle unknown room/ref, repeated names, and objects without graph bindings without guessing.

## Acceptance

From a bench search for `temperature`, the main `PL2-TC1` link opens its detail page. That page identifies Plant 2 as its location, the `pool-temperature-controller:digital` visual item and its visual inspection links, the graph controller node and any modelled containment, known behaviour adapter and drivers, and current measured temperature, set point, mode and valve demand/output where available. The page has explicit Look and audit links. Changes in the saved simulation update the condition. Similar object rows resolve to their own instances, and missing model or status data is labelled rather than invented.
