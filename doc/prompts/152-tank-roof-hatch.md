# 152: The balance tanks' roof hatches open

The owner, 2026-11-03: a brief for the roof hatch opening, the working-components follow-up left by mission 151 (which made the tank roofs walkable and guarded). Brief only; not started until the owner says. Start after 151 has merged.

Read first: `CLAUDE.md` (anything to do with engineering and maintenance is a real, working component with state; one world state; the model first; all input through `src/toolkit/controls/`; displays and sounds follow the model; pure logic in `logic/`, tested beside it; the commit rules), `src/toolkit/controls/CLAUDE.md`, `doc/plans/151-balance-tank-roof-access.md`, `doc/agent-tooling.md` (look links: `?room=plant_pool_01&look=PL1-T1&mode=above`). Claim files on agent-inbox; stage only your own hunks through a private index; don't spawn sub-agents without the owner's permission.

## What there is now (read 2026-11-03)

- **The hatch is a static prop:** `src/toolkit/components/plant/views/balance-plant.ts` (about line 151) draws "Roof hatch with its handle" as two boxes, a 0.7 × 0.06 × 0.7 m GRP lid and a handle bar, on the main pool's balance tank; the sectional tanks of `blockout.ts` (about line 86) describe a hatch too. Nothing opens, and nothing in the model knows a hatch exists.
- **Getting there works (mission 151):** a caged ladder leads onto the tank's walkable, guarded roof (`gallery/logic/walkable-deck.ts`, `addWalkableTankRoof` in `balance-plant.ts`), so the player can stand beside the hatch.

## What to build (normal practice first)

Research and record (in `doc/research/`) a real sectional tank roof access hatch of the kind fitted to a GRP or steel panel balance tank: its size (typically about 600 × 600 mm clear), a hinged GRP lid on stainless hinges, a hasp or padlock staple (water tanks are kept locked against contamination), an inner screen or gasket to keep out dust and vermin (as the water regulations ask of cold-water storage), its stay to hold it open, and what an engineer does there (inspects the water and the float switches and level probe, takes a sample, checks the inlet and overflow). Then:

1. **The hatch in the model and the world:** each tank's hatch is a fitting of its tank (in the room's schematic or the tank's block, with a derived tag, its normal state shut and locked), and its state lives in the world (`world.ts`: open or shut, locked or not; reserve a `WORLD_VERSION` on the mailbox and add a migration that starts every hatch shut and locked).
2. **Working it** (through the controls' use and its cue): unlock its padlock or hasp (a key or a stand-in, as the game handles keys), lift the lid on its hinges to its stay, close it, lock it. A refused use (locked) shows the red cue and says why. Its inspection names it and says its state ("roof hatch, shut, locked").
3. **Looking in:** open, the hatch shows the tank's water inside at its real level (the world's balance tank level), lit by the player's torch, with the float switches and level probe where they are modelled, so an engineer can see what the level instruments report; nothing to fall into (the opening is smaller than the walker, or guarded).
4. **Consequences, only where the model has them:** leaving a hatch open or unlocked is an engineering and safety finding (a contamination risk), shown where the game reports such things (an advisory in the event log or the control room, if one exists for open covers); no invented physics. If nothing reports it yet, note it in `TODO.md`.
5. **Generic:** every tank that has a roof hatch gets the same working hatch (the main pool's balance tank, the sectional tanks in `blockout.ts`, and any other tank with a caged ladder), built once and reused.
6. **Sound:** the lid's hinge and its drop shut, from recorded or synthesised sounds as the game's other parts use (`partAudio`).

## Tests and checks

- Pure: the hatch's state and its rules (locked refuses opening; a shut hatch can be locked; the migration's defaults).
- In the browser, plant room 1: climb onto PL1-T1's roof, unlock and open the hatch, look in (the water level matches the tank's level instrument), close and lock it; reload, and it keeps its state. Record it in the plan, with screenshots by look link.
- The component benchmark if it adds a display; `npm run typecheck`, `npm run lint`, `npm run format:check`, the targeted tests (`--maxWorkers=2`), `npm run build`, then one full `npm test` announced on agent-inbox (one full run per machine).

## Records

The plan in `doc/plans/152-tank-roof-hatch.md`; the research note; the CHANGELOG under Unreleased (`### Added`); `TODO.md`: this mission (it replaces 151's hatch follow-up), ticked with its date and commit.
