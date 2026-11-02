# 138: The simulation graph audit — implementation plan

Plan for `doc/prompts/138-simulation-graph-audit.md`, written 2026-11-02 against `main` at `40f532dd`. Machinery only: the pages are proved on five example nodes; no whole-game run, no recorded counts (those are 132's).

## Contents

1. What the code has (the facts this plan is built on)
2. The graph: nodes, identity, ports, edges, per domain
3. How the domains join
4. The seven sections, and how each is computed
5. Modules: pure logic and views
6. One shared graph module with 129 and 134
7. Page route and catalogue category
8. The hook for the later impact search
9. Acceptance on the example nodes
10. Risks
11. Staged delivery
12. Open questions for the owner

## 1. What the code has

The simulation is not one block tree. `src/game/sim/blocks.ts` gives the addressing (`path/to/block:field`, `parseAddress`, `blockAt`, `read`, `listBlocks`), but the `World` (`src/game/world.ts`, `WORLD_VERSION` 75) holds only one `Block` tree, `identifiedPlant` (the footbath's identified parts, `src/game/plant/identification.ts`). Every other system is a typed slice of `World`, stepped by its own function in `stepWorld`: `plant: PlantServices` (`services.ts`), `motors` (`motor-starters.ts`), `jacuzzi` and `jacuzziCabinet` (`jacuzzi.ts`, `jacuzzi-cabinet.ts`), `installedValves` (`installed-valves.ts`, keyed by fitting or asset id), `lthw` (`lthw-ring.ts`), `boilerHouse` (`boiler-plant.ts`, with its sequencer `boiler-sequencer.ts`), `boilerGas`, `treatment` (`water-treatment.ts`), `dosingPumps`, `aqualis`, `chemicals`, `distribution`, `lighting`, `annunciator` (`src/game/annunciator.ts`), `locationAnnunciators`, `fireAlarm`, `washOTron`, `controlRoomMode`, `lifts` and the rest. The FMI-style `BlockKind`s of `electrical.ts` (`MOTOR`, `BREAKER`, `MCC`, `RCD`, `HEATER`) and `gas-house.ts` are exercised by tests and benches, not by `World`.

The graph that is already explicit is the rooms' schematics: `SCHEMATICS` in `src/game/plant/schematics.ts` (jacuzzi, footbath, lounge, wet hall, corridor water, boiler house, switch room, and the six back rooms of `back-room-schematics.ts`), each `RoomSchematic` with `nodes` (`SchematicNode`: id, kind, code, name), `links` (`PlumbEdge`: source node and port, target node and port, `medium` of `gas | air | water | chemical | oil | power | flue | heat | control`) and given `fittings` (`SchematicFitting`: kind, link, end, `normally`, role, operator, `keptBy`). `schematicExpansion(room)` runs the plumber (`expandForPlumbing`, `plumbing-expansion.ts`) to the room's enhanced network (`Expansion`: nodes, edges, fittings, `along`, `added`, headers). The Olympic plant room (`plant_pool_02`) is not in `SCHEMATICS`; its network comes from `olympicPlumbing()` (`src/toolkit/gallery/logic/olympic-plumbing.ts`), with the annex `olympic-annex.ts`. `roomNetwork(room)` in `src/toolkit/gallery/logic/world-in-model.ts` returns the enhanced network for every built room, Olympic included, and is what 129 reads.

Already built on top of that:

- 129's room audit (`src/toolkit/gallery/logic/room-audit.ts`): `auditNetwork(room)` (nodes, links, `along`), `connectionsOf(model, net, present)` (a node's or fitting's neighbours along each link, labelled `drawn`, `model only` or `boundary`), `controlledBy` and `controlsOf` (131's `targets`), `boardCopies` / `copiesOf` (`NAMED_COPIES` plus control-room mimics matched by kind). Its model refs are room-local: `node:<id>`, `fitting:<id>`, `link:<id>`.
- 131's descriptors (`src/game/descriptors/`): `ObjectDescriptor` (ref, room, kind, class, name, controls, readings, view, presets), `Control.targets` (model refs or tags: `fitting:jacuzzi.isolator`, `PL3-CAB1`, `BH-CP3`), `Control.action(world, input)`, `Reading.read(world)`. Described so far: the Jacuzzi plant room and the control room's mimics (`registry.ts`, `DESCRIBED_ROOMS`).
- 134's diagnostics (`src/game/diagnostics/plant-context.ts`, `plant-connections.ts`): `PlantEquipmentFact` per pump, valve and machine with status, normal and look link; `plantConnectionsFor(fact, facts)` walks every schematic (plus the Olympic one) and returns the links meeting a machine, with the modelled and installed valves on each, matching nodes to facts by name, code, placed asset and an Olympic pump special case.
- Status bindings (prompt 060): `statusBindingFor({tag, kind, room})` in `component-descriptions.ts` says where the world keeps a kind's state (`{ motor }`, `{ pool }`, `{ cabinet: 'jacuzzi' }`, `{ valve }`, `{ uv }` …), and `resolveStatus` / `inspectionStatus` (`component-status.ts`) read it.
- The event log: `EVENT_SOURCES` (`src/game/events/event-sources.ts`): `watcherEvents`, `valveEvents`, `pumpEvents`, `alarmEvents`, each comparing a world before and after.
- Alarms: `ANNUNCIATOR_ALARMS` and `ALARM_TEXT` (`src/toolkit/gallery/logic/control-room-demo.ts`); each alarm's condition is computed inline in `plantReadingOf(world).alarms` (`src/toolkit/gallery/logic/world-reading.ts`, lines ~130–162) and sensed by `senseAlarms` in `stepWorld`; one `AnnunciatorState` serves the old control room's board, the bridge's CR-CP2, Central Control and its viewscreen. The location boards are `LOCATION_ANNUNCIATORS` (`location-annunciators.ts`), sensed by `senseLocations`.

## 2. The graph: nodes, identity, ports, edges

### Node identity

One id scheme, consistent with 129's rows, 125's refs and `blocks.ts` paths: **`<room>/<sort>:<id>`**, where `<sort>` is 129's (`node`, `fitting`, `link`) or one of three new sorts:

- `plant_pool_03/node:cabinet`, `plant_pool_03/fitting:jacuzzi.isolator`, `switch_room/node:incoming` — schematic and enhanced-network items, exactly 129's model refs prefixed by their room, so a 129 row's `model` and `room` give its page with no lookup.
- `plant_pool_03/part:cabinet/pump` — a part inside a node whose state the world keeps but the schematic does not draw (the cabinet's circulation pump, `jacuzziPumpCalled`; a boiler inside the boiler house's node). Parts come from the kinds' part manifests where they exist (`IDENTIFIED_KINDS` in `identification.ts`, `BlockKind.parts`) and otherwise from the state adapter (section 4.3); the path after `part:` uses `blocks.ts`'s `/`.
- `world/state:<slice>[/<key>]` — leaf world state outside the four domains, from `World`'s own fields: `world/state:controlRoomMode`, `world/state:lifts/<id>`, `world/state:lighting/<zone>`.
- `<room>/object:<ref>` — a world object with no model at all (a plant door, a sign), by 125's ref; its page says it is not simulated and reaches only itself.

Graph ids are not `blocks.ts` addresses: `parseAddress` splits on the first `:` and would read `part:cabinet/pump` as a field, so the graph has its own parser (`parseNodeId`: room, sort, id) and keeps graph ids and world addresses apart; where a node's state does live in a `Block` (`identifiedPlant`), its adapter holds the `blocks.ts` address separately. The page is per node, not per field. The URL carries the id percent-encoded.

**Links are evidence, not pages of their own neighbours.** 129's `connectionsOf` returns nothing for a `link:` ref; in this graph a link is carried on each edge (`GraphEdge.link`) and gets a page that lists its sequence of nodes and fittings (from 129's `alongOf`, which also places fittings the plumber's `along` omits), not a neighbour list.

### Ports and edges, per domain

Ports are the schematic's: each `PlumbEdge` names a `sourcePort` and `targetPort`, and the plumber's fittings split a link into the sequence `node → fitting … → node` (`along`). A node's ports are the distinct `(port, medium, direction)` of the links at it; a fitting has `in` and `out` (`FITTING_PORTS`). Edges are the link segments between neighbours in that sequence, the same walk as 129's `connectionsOf` (using its `alongOf`, not the plumber's `along` alone).

**Edge kinds are kept apart** (second opinion): `connects` (a schematic segment; its direction is the link's port orientation, not proof of an effect in every operating state), `controls` (131's targets), `reads` (a reading, lamp or alarm condition reading the node), `copies` (board copies) and `feeds` (a cross-room supply join). Topology is not causation: a node touching power, water and heat links is not taken to mean every input affects every output; only a probed driver (section 4.4) asserts that. The later impact search must choose which kinds it walks. Medium is the link's `medium`, mapped to the brief's words: `water` → water; `heat` → heat; `power` → power; `chemical` → chemical; `gas`, `air`, `oil`, `flue` kept as their own; `control` → signal. **alarm** has no medium in the schematics; alarm edges are the derived edges of section 3.

- **Electrical.** The switch room's schematic (`switch-room-schematic.ts`: `incoming` → `main-switch` → `changeover` → `switchboard` → `rooms`, `lighting-board`, `central-battery`, `generator-cable` as boundary) and each room's own electrics (`roomElectrics` in `schematic-parts.ts`: `busbar` → `switch-fuse` → each machine's `power` port, with the plumber's `power-isolator` fittings). The world's state: `plant.sources.power`, `plant.changeover` (`changeover.ts`, `switchboardLive`), `plant.feeders[room]` (one per `ServiceRoom`, asset and tag in `ROOM_SWITCH_FUSES`, `installed-feeders.ts`), `plant.isolators[name]` (`ISOLATORS`), `lighting` (`lighting.ts`), `centralBattery`, and the starters in `motors` (`MOTORS`, each with its isolator).
- **Heating.** The boiler house schematic (`boiler-house-schematic.ts`) for boilers, pumps, headers and valves; state in `boilerHouse` (`BOILER_TAGS`, `stepBoilerHouse`), its sequencer (`stepBoilerSequencer`, `SEQUENCER_ALARMS`), `boilerGas` and `gas`, and the ring `lthw` (`stepRing`, `ringDraw`, consumers by `consumerK`). Each plant room's `heating` node (`heating-main`) with its `heating-flow` / `heating-return` links is where heat enters the room's graph.
- **Hydrodynamic.** Every room's water links and their fittings; the Olympic network from `olympicPlumbing()`; state in `installedValves`, `loungeValvePositions`, `olympic`, `olympicTank`, `pools`, `jacuzzi`, `spaFilters`, `loungeFilters`, `wetHall`, `motors`.
- **Chemical.** The `chemical` links (day tanks from `dayTanks` in `schematic-parts.ts`, the hypo and acid stores in `back-room-schematics.ts`, the CO₂ schematic `co2-schematic.ts`, the Olympic chemical schematic `olympic-chemical-schematic.ts`, the Aqualis schematic `aqualis-schematic.ts`); state in `chemicals`, `distribution` (`keptBy: 'distribution'` valves), `dosingPumps`, `aqualis`, `treatment` (the water's chemistry), `chemControl`; the air's chemistry in `airHandling` and `gas` zones.
- **Control and warning.** `control` links in the schematics (mimics, valve panels, control plates); 131's `Control.targets` (a control → what it works); the annunciators (section 3); controllers and interlocks that are code, not schematic (sequencer, Wash-O-Tron, Aqualis, cabinet boot), present as part nodes with derived edges (section 3).

Rooms with no schematic (the Olympic plant room's chemical side aside, any room `roomNetwork` returns nothing for) are listed as "no model network" in the Simulation catalogue, not invented.

## 2a. What gets a page: tiers and groups (the owner, 2026-11-02)

Not everything in the simulation matters equally. Each kind declares its tier in the shared classification (`object-class.ts`, beside `architectural` and decorative), once per kind, never per object:

- **Active nodes** hold or change state: machines, valves, pools and tanks, sensors, controllers, alarms and annunciators, feeders and isolators. Only they get node pages, and "what connects to what" is asked between them.
- **Passive connectors** simulate nothing and only carry a signal from one active node to the next: pipes, cables, conduits, plain busbars, and passive fittings (bends, tees, reducers). They are justified by the model (every pipe is one of a schematic's connections) but not simulated. A run of them collapses into one edge between two active nodes, carrying its medium and the list of pieces it passes through (links to them); a "show connectors" switch expands an edge back into its pieces. They get no page and none of the active-node flags; their one check is the one that justifies them: every connector run joins at least two active nodes, or an active node and a room boundary, and a run that connects nothing is flagged as unjustified dressing.
- **Architectural objects** (doors, signs, electrical and fire fittings) are outside the graph: they get an architectural object page, linked from the catalogue, saying they are not simulated (the owner chose this for doors, 2026-11-02). The control room doors are the exception, as leaves of the CONTROL ROOM MODE knob's world state.
- **Groups**, of two kinds, declared by the kind, not guessed:
  - **Simulated as one, drawn as many** (a ganged CO₂ cylinder bank): one node; its page says "simulated as one, drawn as N objects" and lists them with look links; each member object's audit row says it is part of the group and not simulated individually, and is never flagged unbound. Where the model knows the member count, a drawn count that differs is flagged.
  - **A group of individually simulated members** (the boiler cascade: six boilers, each with its own state and controller, under a sequencer): blocks within blocks. The group has a page of its own (the cascade and its sequencer, its members listed), each member has its own page linking up to the group, and edges can be followed at either level.

## 2b. Location (the owner, 2026-11-02)

A node is abstract and has no place of its own, but location is one of the most useful ways to tag and filter the graph ("every node that connects to objects in the boiler house"). So every node carries locations derived from the data, never written by hand, in three kinds:

- **Home room:** the room whose schematic or network defines it (a Jacuzzi valve's is `plant_pool_03`; the switch room's feeders' is the switch room); none for world-wide state (the weather, the LTHW ring as a whole, which spans rooms, lists the rooms it passes through instead).
- **Shown in:** every room holding an object bound to it or a display, lamp or mimic showing it (a Jacuzzi alarm is shown in `plant_pool_03`, the old control room and the bridge).
- **Touches:** the rooms of its direct neighbours' bound objects (one step only; the exhaustive version belongs to the later impact search).

For a portable object, its default location (where the game places it at the start) and, where the world holds it, its current one are given separately.

The `?dev` Simulation list and the pages filter by room on any of the three (home, shown in, touches), and by domain, tier and flag, so "every active node that touches the boiler house" is one filter. A room's audit (129) gains a link to that filtered list for its room.

## 3. How the domains join (found, not invented)

Only joins the code already states are edges. Each is a pure function returning `GraphEdge`s with `via` naming its evidence (a file and symbol), so the page can show why the edge exists.

1. **Same node, several media (in-room).** A schematic node with links of more than one medium is where domains meet: the Jacuzzi cabinet has `power` (from the switch-fuse), `water` and `heat` (`heating-flow`) ports. The page shows the ports side by side; that power drives the water is asserted only by the cabinet's probed drivers (`jacuzziPumpCalled` reads supply), never inferred from the ports.
2. **Room supply to switch room (power, cross-room).** A room's `switch-fuse` node is the far end of the switch room's `rooms` node, keyed by room through `ROOM_SWITCH_FUSES` and `ROOM_SERVICES`; `serviceAvailable` (`services.ts`) is the evidence that the room's feeder and the switchboard gate it. `UTILITY_SOURCE` names a source room, not a port, so each cross-room join is an explicit mapping table (room node ↔ source node and port), tested, never a join by room name alone.
3. **Heating main to boiler house (heat, cross-room).** A room's `heating-main` node joins the LTHW ring's consumers. These are keyed by use, not by room (`heat-consumers.ts`: `pool_XX/water`, `pool_XX/air`, area ids), so a room's heating main may map to several consumers; the mapping is an explicit table.
4. **Water service, waste and boundary nodes (water, cross-room).** A `water-service` node joins the wet hall's (`UTILITY_SOURCE.water`); the corridor water schematic's `boundary` nodes name their other ends (`wet-hall-boost`, `wet-hall-pit`, each room's `-make-up` and `-waste`); a room's `boundary` node is joined to the corridor's node of the same name. Where a boundary's other end cannot be found from the code, it stays a dangling boundary and the page says so (no guessing).
5. **Chemical supply (chemical, cross-room).** Day tanks' fill links join the distribution selectors (`chemical-distribution.ts`, `DAY_TANKS`) and the stores (`UTILITY_SOURCE.chemical = 'hypo_store'`; `serviceAvailable` also needs the acid store's feeder, a second upstream the table must carry).
6. **Control → model (signal).** 131's `Control.targets`: a control on object A that targets `fitting:x` or a tag is an edge from A's control to that node; its room is the descriptor's room. This is 129's `controlledBy` / `controlsOf`, reused.
7. **Board copies (signal).** 129's `boardCopies()`: a plant room mimic and its control-room copy share one world state, an edge both ways labelled `copy`.
8. **Model → alarm (alarm).** Each annunciator window's condition is code in `plantReadingOf(...).alarms` and each location board's in `LOCATION_ANNUNCIATORS`. A new declared table, `ALARM_SOURCES: Record<AlarmId, NodeId[]>` (beside the alarms, in `logic/`), names the nodes each window reads; it is checked, not trusted. A fresh world's windows are dark until `stepWorld` senses them, so each probe changes one listed source at a time, steps the world, and asserts both the condition in `plantReadingOf(...).alarms` and the window going to `flashing`; a compound condition (`flow-low`, `dosing-inhibit`) takes a probe per source. Alarm → annunciator: every `AlarmId` reaches the one `AnnunciatorState`, and through it the old control room's board and the bridge's displays (found from the components that read `world.annunciator`, listed once in the same module).
9. **World state reading the plant (leaves).** A leaf is joined only where the code reads plant state into it (the lighting's ways from the switchboard, `lightingWaysLive`; the control room doors from `controlRoomMode`); a plant door has no join.

Joins that are only implicit in step functions (the boiler's firing reading ring flow; dosing inhibited by circulation) are not edges until a declared table names them and a probe test proves them, as for alarms. The first delivery declares only those the five example nodes need.

## 4. The seven sections

Every section is a pure function `(graph, nodeId, inputs) → SectionData`, rendered by one view. A blank is a finding, not an error (129's rule).

### 4.1 What is it

Path (the node id, and its `blocks.ts`-style address where the node has one), domain (from its media; several if it joins domains), kind (the schematic node's `kind`, the fitting's `FittingKind`, `link`, or the part's kind), room (`ROOMS` name), tag (the schematic code with the room's code, `PL3-CAB1`, or the fitting's tag from `MODEL_VALVES` / `INSTALLED_VALVES`; never written by hand), derived name and description (`componentDescription` / `describeComponent` in `equipment-catalogue.ts` and `component-descriptions.ts`, as the inspection overlay has it), and the bound object's maker (`brands.ts` by kind, as 129's `makerOf`).

### 4.2 How does it connect

Its ports, each with direction (source port = out, target port = in; a fitting `in`/`out`), medium, and the node on the far side, each a link to that node's page; 129's `drawn` / `model only` / `boundary` label where the node is in a built room. Cross-room joins from section 3 appear as the far side of the boundary.

### 4.3 What state does it hold

From a **state adapter** per node kind: `StateAdapter = { fields(node) → FieldSpec[] ; read(world, node) → Record<string, unknown> }`, where `FieldSpec` is name, type, unit, range or values, saved (whether it lives in `World`, so in `save.ts`), and normal (from the schematic: a fitting's `normally`, an identified part's `normal`). Adapters are built from what already says where state lives: `statusBindingFor` (pumps, tanks, cabinets, UV, valves), `keptBy` on fittings (`identified` → `identifiedPlant` via `read`; `register` → `installedValves`; `distribution` → `distribution`), `ROOM_SWITCH_FUSES` (feeder → `plant.feeders[room]`), `ISOLATORS`, `MOTORS`. Values and ranges from the types where they are unions (`StarterMode`, `AlarmWindow`, `ChangeoverPosition`) and from 131's `Control.inputs` and `Reading` where the type is open. The current value is read from `newWorld()`; a node with no adapter shows "state not found in the world", which is section 7's input. Never default missing state to Off (`doc/equipment-status.md`).

### 4.4 What makes it change

Per adapter, declared and probed like section 3's alarm table (a test changes the driver and steps, and asserts the state moves): its drivers (its inputs through its ports, the step function that changes it, its controller, the controls whose actions set it from 131's `targets` and `action`), whether instant (an action) or over time (a step), the faults and trips it models (only those its state has, by the status-words rule: On/Off unless faults are modelled), and the event-log lines it can produce (which of `EVENT_SOURCES` notices it; a sample line made by running that source over a preset world before and after). A node's own lines are told apart from a related object's: the cabinet pump's trip is logged by `watcherEvents` (`watchers.ts`), not by `pumpEvents`, which watches the motor starters and the wet-hall booster.

### 4.5 What is it related to

Direct neighbours only: upstream (edges into it), downstream (edges out of it), controls acting on it (section 3, join 6), sensors and readings reading it (131's `Reading` has only `read(world)`, no model target, so this needs a new optional `Reading.reads: string[]` of model refs, proposed to 131's owner, filled for the example nodes; mimic lamps through board copies), alarms it can raise (the inverse of `ALARM_SOURCES`) and on which annunciators (the old control room's board, the bridge, any location board).

### 4.6 Where does it appear in the world

Bound objects: 127's scene marks and the room's `world-in-model` binding (`{ node }`, `{ fitting }`, `{ link }`). A node may have many representations in the world (the owner, 2026-11-02): a fault code shown on several annunciators, because codes are shared between them or because an annunciator is duplicated (a plant room's board and its control-room copies, 129's copies). Every one is listed, grouped by room, each saying why it is there (bound directly, a shared code, a copy of another board), and each linking to that object's own audit (its row in its room's audit, 129, from which its look link and its kind's item audit are reached), not to a look link directly; displays, lamps and mimics showing it here and in both control rooms (board copies, readings); whether the player can see it (any bound object or reading) and act on it (any control targeting it). From data only; a binding known only from a scene is fetched by 127's scanner for that one room on demand (a button, not on load).

### 4.6a The reverse: from an object to its nodes (the owner, 2026-11-02)

Every object's audit (its row in its room's audit, 129, and each placement on its kind's item audit, 130) shows the simulation nodes bound to it, each a link to that node's page. An object binds at most one node at its own level (a valve to its fitting, a pump to its block, an annunciator to its own power and fault-relay node), and its ports line up with that node's ports, listed beside them. Composite objects bind more through their named parts, each part to its own node (a mimic board's lamps and readouts to the alarm and reading nodes they show; the Jacuzzi cabinet's pump part to `part:cabinet/pump`), listed under the part. An object bound to two nodes at its own level, or a part bound to none where its kind expects one, is flagged. Architectural objects say they are not simulated; members of a group say which group node they belong to (2a).

### 4.7 Is anything wrong with it

Flags, each computed from the sections above. Each flag is `yes`, `no` or `unknown`: where its inputs are not yet described (131 covers only the Jacuzzi room and the control room's mimics; adapters and `Reading.reads` are partial), the flag is `unknown`, never a finding:

- `invisible` — simulated (has state) and nothing in the world shows it (no bound object, reading or lamp).
- `uncontrollable` — its kind is workable (a valve, isolator, switch, starter: `operator` or `Control` exists for its kind elsewhere) and no control targets this one.
- `no-effect` — no downstream edge (a sink kind such as a gully, drain or annunciator excepted).
- `no-source` — no upstream edge (a supply kind such as `incoming-supply`, `water-service` excepted).
- `alarm-not-both` — an alarm it raises does not reach both the old control room and the bridge (the memory rule).
- `missing-tag` / `duplicate-tag` — no derived tag where its kind should have one; or 127's `duplicate-tag` finding.
- `no-state` — no adapter found its state (section 4.3).

## 5. Modules: pure logic and views

Pure, in `logic/` folders with tests beside them (`vite-plus/test`):

- `sim-graph/graph.ts` — the shared graph: `NodeId`, `GraphNode`, `GraphEdge { from, fromPort, to, toPort, medium, via }`, `buildGraph(sources)`, `neighbours(graph, id, direction)`. Built lazily per room plus the joins, cached on the module as `schematicExpansion` caches.
- `sim-graph/sources/*.ts` — one source per network: schematics (via `schematicExpansion` and `roomNetwork`'s logic moved down from the gallery), the Olympic network, joins (section 3), controls (131), alarms (`ALARM_SOURCES`), leaves.
- `sim-graph/state-adapters.ts` and `drivers.ts` — sections 4.3 and 4.4.
- `sim-graph/node-page.ts` — the seven sections' data, `nodePage(graph, id, { world, descriptors, catalogue, copies })`.
- `sim-graph/flags.ts` — section 4.7.

`src/game/` must not import from `src/toolkit/`; today `world-in-model.ts`, `olympic-plumbing.ts` and `control-room-demo.ts` (alarm ids) live in `src/toolkit/gallery/logic/`. Either the graph module lives in `src/toolkit/gallery/logic/sim-graph/` (as 129's room audit does) or the pieces it needs move down. Decided: it lives in `src/toolkit/gallery/logic/sim-graph/` (no moves, no conflict with other agents' files; 134's `plant-connections.ts` already imports gallery logic, `olympic-plumbing.ts`). The module names below are relative to that folder; moving it into `src/game/` is a separate later layering cleanup.

Views (DOM, no Three.js): `src/toolkit/gallery/views/sim-node-page.ts` (the seven sections, links), and the Simulation tab in `catalogue-panel.ts`.

## 6. One shared graph module with 129 and 134

129's `connectionsOf` and 134's `plantConnectionsFor` both walk the same networks with different identity rules: 129 by room-local model ref, 134 by matching facts to nodes by normalised name, code and asset id, and with its own copy of the network list (`allNetworks` builds the Olympic one itself). Proposal: the graph module owns the network list and the segment walk (with 129's `alongOf`); 129's `connectionsOf` becomes a thin call (`neighbours` plus its scene-dependent `drawn`/`model only`/`boundary` labelling from its `present` set, which stays outside the graph core). 134's output is not direct neighbours: `plantConnectionsFor` reports whole base links, their endpoint facts and every valve on each link. It keeps that shape, derived from the same networks, and its identity matching (name, code, placed asset id, the Olympic pump-set special case) becomes one shared identity map from facts to node ids that reports unmatched and ambiguous cases, rather than being replaced by tag-only matching. 134 is `farhad_taphrale`'s; its change is offered to that agent on the mailbox, not made by this mission, and 129's is made only after 129's owner agrees. Until then the graph module reads the same sources and has parity tests: its neighbours for the Jacuzzi room equal 129's `connectionsOf` for every node there, and its links for a Jacuzzi and an Olympic pump equal 134's `plantConnectionsFor`.

## 7. Page route and catalogue category

- **Route:** `bench.html?bench=sim-node&node=<id>` for one node's page; `bench.html?bench=sim-graph` for the searchable list (by domain, room, kind, path). Added to `src/bench.ts` beside `room-audit` and `item-audit`, and registered with 137's page registry if it has landed.
- **Catalogue:** registered through 137's shared page registry where it has landed, so the bench index and `?dev` show it from one entry; until then a fourth tab, **Simulation**, in `catalogue-panel.ts` (`Category` becomes `'rooms' | 'kinds' | 'brands' | 'simulation'`), listing nodes grouped by domain then room, searchable by id, tag, name, kind. Built from data only.
- **Links in:** 129's model node column and 130's item audit link each bound model ref to its node page (`simNodeLink(room, model)`), one line each in their pages.

## 8. The hook for the later impact search

The graph exposes `neighbours(graph, id, 'down' | 'up', { media? })` and every edge carries `medium` and `via`, so a later `walk(graph, id, direction, filter) → { node, path: GraphEdge[] }[]` is a breadth-first search over that one function, with the bound objects of section 4.6 as its reach. This mission ships `neighbours` and a typed, unimplemented `ImpactSearch` interface in `graph.ts` with a comment naming the later mission; no walk, no counts.

## 9. Acceptance on the example nodes

Each opens at its URL and shows all seven sections, every neighbour a link to its own page, every bound object a look link:

1. **A Jacuzzi plant room valve** — `plant_pool_03/fitting:<the drain valve's id>` (`JACUZZI_VALVES.drain`): kind isolating valve, normal from the schematic, state from `installedValves`, controlled by its handle (131, `fitting:…` target) and the valve panel, upstream and downstream along its link, its event lines from `valveEvents`.
2. **The Jacuzzi cabinet's pump** — `plant_pool_03/part:cabinet/pump`: state from `jacuzziCabinet` (running by `jacuzziPumpCalled`, the no-flow trip `NO_FLOW_TRIP`), upstream the cabinet's power port (switch-fuse, isolator, `plant.feeders.plant_pool_03`), downstream the cabinet's water ports, controlled by the cabinet's POWER switch (`PL3-CAB1/power`), its trip line from `watcherEvents`.
3. **The main incoming supply** — `switch_room/node:incoming`: downstream the main switch, changeover and switchboard, the rooms' feeders across the room-supply join; state `plant.sources.power` only (the changeover's `plant.changeover` belongs to `switch_room/node:changeover`, its downstream neighbour); raises `mains-fail`, shown on the old control room's board and the bridge.
4. **An alarm point** — the `mains-fail` window (or `p1-trip`), as node `control_room/alarm:mains-fail` (a part of the annunciator node): upstream from `ALARM_SOURCES`, its window state from `annunciator.windows`, its ACCEPT and RESET controls, its lines from `alarmEvents`, `alarm-not-both` false.
5. **A door as a leaf** — a plant door (`plant-door.ts`), `<hall>/object:<its ref>`: no state, no edges, "not simulated; reaches only itself" (how doors are shown is an open question, section 12).

Tests: `graph.test.ts` (ids round-trip; Jacuzzi neighbours equal 129's), `joins.test.ts` (each join on a known pair), `alarm-sources.test.ts` (each declared alarm comes in from its preset), `node-page.test.ts` (the five nodes' sections), `flags.test.ts`.

## 10. Risks

- **Topology read as causation.** Kept apart by edge kinds and probed drivers (section 2); the impact search must not walk `connects` edges as if they were effects.
- **Incomplete data read as findings.** Flags are `unknown` where descriptors, adapters or scene marks are missing.
- **Two graphs disagree.** Mitigated by the equality test with 129 and by routing 134 through the module.
- **Hand tables drifting** (`ALARM_SOURCES`, drivers, joins). Mitigated by probe tests from fresh worlds; each entry names its evidence (`via`).
- **State outside blocks.** Most state is typed slices, not `Block`s, so section 4.3 depends on adapters; a node without one shows `no-state` rather than a guess.
- **Cost.** Expanding every room's network and the Olympic plumbing is heavy; build per room on demand and cache.
- **Shared files.** `catalogue-panel.ts`, `bench.ts`, `room-audit-page.ts`, `item-audit-page.ts` are claimed by others often; claim on the mailbox first.
- **Layering.** `src/game` cannot import gallery logic (section 5).

## 11. Staged delivery

1. **Graph core** — node id parser, namespaces, edge kinds, provenance (`via`) and coverage status settled first; the schematic and Olympic sources, `neighbours`, the 129 and 134 parity tests. Pages: sections 1 and 2 only, for nodes 1 and 3.
2. **Joins** — section 3's joins 1–7; nodes 2 and 3 reach across rooms.
3. **State and drivers** — adapters for the five nodes' kinds; sections 3 and 4.
4. **Alarms and world** — `ALARM_SOURCES` for the example alarm and those on its path, alarm → both control rooms; sections 5 and 6; node 4.
5. **Flags, leaves, links in** — section 7, node 5, the Simulation tab, links from 129 and 130, `bench=sim-graph`.
6. **Records** — `TODO.md`, `CHANGELOG.md`, `doc/agent-tooling.md`, a diary entry; offer 134's change on the mailbox.

## 12. Open questions for the owner

A second opinion (Codex, 2026-11-02) checked this plan against the code; its factual corrections are folded in above. These are the owner's to decide:

1. ~~Should architectural doors have simulation-node pages?~~ Decided (the owner, 2026-11-02): no; an architectural object page outside the graph (see 2a).
2. ~~Simulation as its own `?dev` tab or only through 137's registry?~~ Decided (the owner, 2026-11-02): A, a fourth `?dev` tab now, moved into 137's tree, registering through its registry, when 137 lands.
