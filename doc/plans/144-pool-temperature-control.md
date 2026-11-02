# Mission 144 plan — Pool temperature control in plants 1 and 2

Plan, 2026-11-02. Based on mission 144, mission 120's LTHW ring, the current `thermal.ts` and the pool room schematics. Mission 144 reserved and uses `WORLD_VERSION` 76 through agent-inbox.

## Model

Add a per-pool water-heating control state for `pool_01` and `pool_02`: local AUTO/HAND mode, set point, sensor measurement, controller demand, requested valve position, actual valve position, and fault/inhibit status. Prefer a per-pool record matching existing world-state patterns; keep it on the one `World`, stepped when the player is in any room.

Replace the current abstract water thermostat only for these two pools. Keep the existing hall-air coil thermostat and the other pools unchanged. The pool's heat draw is constrained by its controller request, the primary control valve's opening, the existing exchanger conductance, pool temperature and the LTHW flow temperature. Closed primary isolators give no heat. Define actual valve movement with a finite travel time and deterministic state transitions. Preserve today's behaviour for old saves: set point is `waterSet(pool)` / current pool set point, AUTO, both isolators open, valve available.

The primary schematic has two normally-open isolation fittings and one modulating two-port valve on each exchanger branch. Exact module ownership differs: Lounge schematic in `src/game/plant/lounge-schematic.ts`; Olympic topology starts in `src/toolkit/gallery/logic/olympic-plan.ts` and is expanded in `olympic-plumbing.ts`. Bind all fittings through the existing enhanced-network plumbing path; do not draw extra valves outside those schematics.

## Delivery slices

1. **Research and pure rules:** completed. The research fixes a two-port LTHW flow valve, outlet-water temperature sensing, an analogue West 6000 and digital CAL 3300 as inspired product references; exact West 6000 release date remains unverified. The pure controller/actuator has AUTO/HAND, finite travel, stuck-valve and probe-bias states.
2. **World and save:** version 76 adds the two pools' saved controls and a 75→76 migration preserving each saved set point. The controller's actual valve opening directly caps pool-water heat. Controller mode/output, primary isolators, valve fault and sensor fault have world actions.
3. **Schematic and reader:** complete. Lounge primary flow and return isolators are in its enhanced schematic; the Olympic uses its existing primary isolators. Both LTHW control valves are distinct regulating fittings; the Olympic pool-side commissioning regulator remains separate. Control, power, sensor and rack/player relationships join each room's model, and the outlet Pt100 and cable bind to that model.
4. **Equipment:** complete for local room equipment. Dev65 has save-isolated West 6000 and CAL 3300-inspired working controller demonstrations. Each plant room has an 8U wall enclosure containing a scaled 2U controller, a separate local-controls panel and a retained 1U music source. The controller fascia is scaled to the product dimensions and the remote probe is on the exchanger outlet; the headless screenshot tool's browser render is black, so visual appearance still needs inspection in a working browser.
5. **Mimics and browser context:** complete. The pool and heating mimics receive the live outlet-probe measurement, controller demand and actual valve position; the pool mimic also shows the setpoint. The shared `plantProcessLines` renderer feeds both the page's always-present accessible process section and the full report with controller mode, setpoint, sensor, demand, commanded versus actual valve position, isolator/interlock/fault state, and simulation-time pool-temperature and valve trends. Branch flow and pressure remain explicitly unreported because the LTHW model does not resolve them.
6. **Acceptance:** pure controller, thermal, save, schematic, room layout, object-binding, registration and integration tests pass. The full suite passes 5,748 tests (74 expected failures, 17 skipped); after the browser/mimic slice, focused tests and `npm run typecheck` pass. Plant 2 initializes in `scripts/look.ts` and the rack has a reachable pose; no visual screenshot could be verified because the headless frame is black and CUA browser host is unavailable.

## Waiting and ownership

Mission 143/VFD and printer work belongs to Nicole; avoid those files. Keep all implementation on the shared `main` checkout and claim every later overlap by mailbox. Mission 140 benefits from the new heating path but does not block the independent model work.
