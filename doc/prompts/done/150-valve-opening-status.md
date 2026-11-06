# 150: Partly open valves say how far open

Tracked in #29; done, see `doc/plans/150-valve-opening-status.md`.

The owner, 2026-11-03: "Valves that are partially open should say so, rather than just 'open' or 'closed'." `nicole_buruaah` investigated and wrote this brief. Brief only; not started until the owner says. Fits with mission 149 (the modulating valves' sound); do it after or beside it.

Read first: `CLAUDE.md` (tags, names and descriptions are derived from the model, never written by hand; one world state; displays redraw only on change; pure logic in `src/game/` and `logic/`, tested beside it; the commit rules), `doc/agent-tooling.md` (look links, the room audit). Claim files on agent-inbox before editing; stage only your own hunks through a private index; don't spawn sub-agents without the owner's permission.

## What there is now (checked 2026-11-03)

- A valve's status comes from `resolveStatus` in `src/game/plant/component-status.ts` (about lines 152–173), as `{ policy: 'valve', open, partly? }`, and is put in words by `inspectionStatus` (about line 217: `partly ? 'part open' : open ? 'open' : 'shut'`) and by the description prose in `src/game/plant/component-descriptions.ts` (about line 348: "Currently part open").
- **Where it reads a position:** only the Lounge's actuated valves, `world.loungeValvePositions[id]` (≥ 0.98 open, ≤ 0.02 shut, between them "part open"). Otherwise it reads a boolean: `world.installedValves[id]`, or an identified part's `open`.
- **What it misses:** the pool heat exchangers' modulating LTHW control valves (PL1-HX1-CV1, PL2-HX1-CV1; missions 144 and 148), whose opening is `world.poolTemperatureControls[pool].valvePosition` (0–1, in 0.1 steps after 148's quantisation), are not read there at all, so they show plainly open or shut; and no valve ever says how far open it is.

## What to build

1. **Every modelled position read:** `resolveStatus` gains the opening (0–1) wherever the world models one: the Lounge's `loungeValvePositions`, the pool temperature control valves (`poolTemperatureControls[pool].valvePosition`, matched to their tags), and any other regulating or modulating valve the model holds a position for (search the world for position fields; a fixed hand-set regulating valve, such as the Olympic's `battery.outlet.regulating`, says its set opening if the model records one). A valve with only a boolean stays open or shut.
2. **The words**, one pure function used everywhere: "shut" at or below 2 %, "open" at or above 98 %, otherwise "part open, 30 %" (whole percent, or the 10 % steps the controller uses), and, for a modulating valve, what it is doing when it is stroking ("opening, 40 %", "closing, 30 %") if mission 149 makes the commanded position available. Decide the exact wording and record it.
3. **Every surface uses it:** the inspection line and heading (`inspectionStatus`), the description prose (`component-descriptions.ts`), the room audit (129) and the object detail page (145), the simulation graph's node pages (138), 134/139's browser plant report and 131's descriptors' readings, and any mimic or panel that already shows a valve as words. Nothing writes its own "open"/"shut" for a modelled valve.
4. **Tests:** the function's thresholds and wording; each kind of valve (Lounge actuated, HX control valve at 0, 0.3 and 1, an on/off installed valve) reading correctly through `inspectionStatus` and the description.
5. **Check in the browser** by look links: `?room=plant_pool_02&look=PL2-HX1-CV1&mode=front` with PL2-TC1 in AUTO and the valve part open; HAND at 100 %; OFF. The inspection line and the room audit agree with the valve's position.

## Records

The plan in `doc/plans/150-valve-opening-status.md`; the CHANGELOG under Unreleased (`### Fixed`); `TODO.md` ticked with its date and commit; `doc/agent-tooling.md` if a tool's output changes.
