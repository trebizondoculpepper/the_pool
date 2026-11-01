# 119 plan: water destinations and sources in the wet hall

Status: draft for agent review, 2026-11-01. This plan follows the owner's decisions in [mission 119](../prompts/119-wet-hall-water-mimics.md) and the wet hall's [existing layout plan](036-wet-hall-tanks.md).

## Two boards

```text
FRESH:  BREAK TANK → BOOSTER ┬→ Lounge    [FT] m³/h
                              ├→ Olympic   [FT] m³/h
                              ├→ Jacuzzi   [FT] m³/h
                              └→ Footbath  [FT] m³/h

DIRTY:  Lounge   [FT] ─┐
        Olympic  [FT] ─┤
        Jacuzzi  [FT] ─┼→ BACKWASH PIT → DISCHARGE PUMPS → SEWER
        Footbath [FT] ─┘
```

The dirty board should use arrows towards the pit and a mirrored layout, rather than reverse the physical flow. Label the Jacuzzi and Footbath drain-down routes `TO PIT`; show source indicators from actual contributions rather than calling every waste flow BACKWASH. Lounge's branch also carries filter dump, rinse and drains, plus its balance-tank drain through `lounge-valves.ts`. The large pools' direct _pool_ drain-downs can be mentioned on a small route note; they do not enter a pit branch's number. Show m³/h to one decimal place where useful, with a stable zero rather than flicker from tiny volumes. Use the same branch order on both boards so a player can compare them by eye. The boards' headings should be the owner's two questions or short equivalents that fit on the panel.

## Model and readings

1. Keep WH-G1 and WH-FT1 on the town-main inlet and the outfall monitor after the pit. Do not use their values as pool-branch rates. Add one modeled transmitter on each of the four make-up feeds after its ring tee and one on each pool's pit-bound waste branch before any join. Place them at the corresponding plant-room boundary or in its branch run, with stable tags appropriate to their actual location; check for catalogue collisions. Their signals can travel to the wet-hall boards over the modeled control bus. The eight meters need not all be physically in the wet hall. Retain the installed WH-MP1 identity for the replacement fresh board and assign WH-MP2 to the new dirty board, subject to the catalogue's derivation rules.
2. Keep the wet hall's common clean and dirty mains where they physically exist. `corridor-services.ts` already draws four clean ring tees, while Lounge and Olympic backwash join in the corridor before reaching the wet hall. Define meter nodes and ports in the appropriate pool-room/branch networks, then check `wet-hall-plumbing.ts`, the corridor routing and room-boundary links. A meter drawn on a shared header cannot be called an individual branch meter. Give each pool room an explicit pit-waste boundary outlet before the corridor join, keeping floor/deck gullies for their separate drainage; the Jacuzzi and Footbath schematics currently direct cabinet drains and filter washes to a local gully and have no corridor connection to the pit. Route those waste branches to the pit before installing their pit-inflow meters; preserve separate clean and waste circuits and gravity/drainage constraints. Each new instrument needs a graph node, connection/port, power or signal as appropriate, state, drawing and readout binding.
3. At the pool step, capture per-pool `madeUp`, `backwashed` and pit-bound `drained` in m³. Audit `water-balance.ts` first: Olympic and Jacuzzi tank drains currently go into `spilt`, which reaches neither pit nor sewer. Choose and model their actual outlet, probably the room's pit-waste branch, and keep true spills separate. Identify any once-a-day lumped wash still produced by the generic water model; put that waste through a timed, valve-driven path before deriving an instantaneous flowmeter rate. Convert actual routed volumes to m³/h using the same `dt` as `wetHall.flow` and `wetHall.pitInflow`; no division for zero-duration steps. Persist a per-pool transmitter reading with a short physical damping time, bump `WORLD_VERSION` and migrate old saves to zeroed readings. WORLD_VERSION 67 is reserved for mission 118 as of this draft; choose the next free version when implementing. Avoid a second independent water balance: the instruments observe the volumes the pools already moved.
4. Reconcile `sum(make-up branches) = wetHall.flow` and `sum(pit branches) = wetHall.pitInflow` to numerical tolerance. Pit branches equal per-pool backwash plus spa drain-down; the separately tracked large-pool `drained` goes directly to sewer. Confirm that `stepSewerMonitor` still sees pit outflow plus direct sewer drain-down, with no double counting.
5. Preserve the existing booster valve buttons and RESET on the local fresh board. Preserve local-only controls on the dirty side where appropriate. If a control-room copy is added, carry readings and permitted remote actions only; keep reset and selectors local. Round displayed rates to 0.1 m³/h before the mimic's change comparison, so its canvas redraws only when a visible value changes.

## Scene and validation

The fresh board's mounting target is the clean bay's west partition, near x = −4.8, z = −5.7, facing east into the bay. The owner's URL is a camera pose, not a panel centre; ray/sightline and 2.2 m panel clearance need checking in the running room. The dirty board belongs near the pit; the prior wet-hall plan suggests the east wall around z = +4 to +7, but that wall now also carries the outfall monitor and chemical control box, so choose its final slot from measured clear space. Both boards may need a revised width or readout size to make four rates legible at working distance. Check player reach and walking routes as well as visual readability.

Prototype both boards in dev39 or another suitable development room. Add pure tests for routing and conservation, mimic-state tests for each branch and source indicator, and layout tests for occupied wall spans. Exercise at least normal make-up, booster shut/tripped, simultaneous washes, spa drain-down, tank drain, generic daily wash and large-pool direct drain-down. Check the 160 mm backwash main under coincident spa drainage and large-pool wash. Inspect the boards in the browser from the supplied clean-bay view and a dirty-side view. Benchmark the two display components, then run typecheck, lint, format check, tests and build.

## Questions for peer review

- What is the smallest model-first way to represent the existing four clean ring tees, the large-pool waste join and the missing spa-to-pit waste routes, so each sensor sits on the flow it reports?
- Where should the eight instruments physically sit so the visual pipes and measured branches agree, and is there room on the dirty side for the second board?
- Is the dirty board's source indication clear when backwash, rinse, dump, filter drain and tank drain can coincide, and which should be grouped for legibility?
- Does retaining WH-MP1 for the replacement fresh board preserve installed-asset and save compatibility, and what new tag should the dirty board use?

## Review received, 2026-11-01

Nicole and Ahnaa checked the first draft against the code. Both confirmed the spa schematic/corridor mismatch and recommended distinct pit-waste boundary outlets before the common main, with deck gullies retained separately. Ahnaa noted the 160 mm main must be checked under simultaneous spa drain and large-pool wash. Nicole found Lounge dump, rinse and tank/filter drains in its pit-bound `toWaste`, the Olympic and Jacuzzi tank drains going unaccounted into `spilt`, possible one-step daily-wash spikes, and the need for short transmitter damping and rounded display values. The plan above incorporates those findings. Nicole also confirmed that keeping WH-MP1's installed key preserves its identity and suggested WH-MP2 for the second board. WORLD_VERSION 67 is reserved for parallel mission 118 work; mission 119 must take the next free version if it persists sensors.
