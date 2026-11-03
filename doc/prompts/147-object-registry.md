# 147: One object registry: every kind builds itself anywhere, from minimal knowledge of how it fits the world

The owner, 2026-11-03, on the pool temperature controller's item audit showing no CAD views because no magic-room adapter was registered: "This sounds like a really bad design. We shouldn't need a special adaptor for each component to fit in a magic room; it should automatically adapt but just with some minimal knowledge of how the object fits in the world, e.g. is it floor, ceiling or wall mounted. An object should not require explicit registration for magic rooms, however it would be quite useful if there was a central registry of all objects which mapped name or ID to the object itself, and in doing so registered its behaviours with the world." Brief only; not started until the owner says. Read `CLAUDE.md`, `doc/plant-model.md`, `doc/agent-tooling.md` and missions 126, 130, 131 and 133 first.

## What there is now (checked 2026-11-03)

There is no single object register (investigated 2026-11-03). The closest is **`EQUIPMENT_KINDS`** (`src/game/plant/equipment-kinds.ts`, prompt 060): one finite, pure list of every kind (`PLACED_KINDS` and `OTHER_KINDS`), typed `KindId`, "so no kind can be added without its wording". Each `EquipmentKind` holds its tag code, class (plant, non-plant, decorative), its word in descriptions, how its live status is put (`StatusPolicy`), its purpose and its brand: identity only, with no builder, mounting, size or world binding. Everything else about a kind is spread over several registries, keyed differently, each written by hand:

- **Installed instances:** `installed-asset-ids.ts`, keyed `room|key|label`: asset id and tag, for placed equipment.
- **Behaviour:** `src/game/descriptors/registry.ts` (mission 131), keyed by room (`DESCRIBED_ROOMS`), so far only the Jacuzzi plant room and the control room's mimics; lookups by ref and control id.
- **Dev rooms' exhibits** (`rooms/plant/*.ts`, `EXHIBITS`): a title, maker, reference, `size: { w, d, h, mount: 'floor' | 'wall', y }` and a `build(kit)`: already the minimal placement knowledge the owner asks for, but only for exhibits.
- **`MODELS`** (`src/toolkit/gallery/views/room-equipment.ts`, about line 280): the plant rooms' machines, by their key in `logic/room-equipment.ts`, each pointing at an exhibit by its title (`byTitle(PUMPS, …)`). Its keys need not match the kind (`watershed-pool-temperature-controller` versus `pool-temperature-controller`).
- **Special cases in the room builder** (`room-equipment.ts`, for example the pool temperature controller about line 401): kinds built inline, bound to the live world, reachable from nowhere else.
- **The magic room's adapters** (`views/magic-adapters.ts`, `adapterFor`): explicit adapters for three kinds, else `MODELS`; a kind in neither has no 3D form, so no magic room and no CAD views (133).
- **Identity and model:** `equipment-kinds.ts` and the kind catalogue (`logic/kind-catalogue.ts`, mission 126); `installed-asset-ids.ts` (asset ids and tags); `markComponent` identities in the scene.
- **Behaviour:** `world-bindings.ts` (how each key binds to the world, or `todo`/`passive`); 131's control descriptors (parts, controls, the world action each drives, presets).

So a new kind must be added in several places, and each consumer (a plant room, a dev room, the magic room, the CAD views, the item audit, the catalogue) finds it, or fails to, in its own way.

## What to build

**Don't start a new register: make `EQUIPMENT_KINDS` the spine.** Its `KindId` becomes the one key for a kind everywhere. Two tables hang off it:

- **The pure side** (`src/game/plant/equipment-kinds.ts` or a module beside it): each `EquipmentKind` gains its mounting, footprint and attachment, its world binding (what it reads, which world actions its controls drive), and its descriptor by kind (131's registry re-keyed from rooms to kinds, with the rooms' instances found through the register).
- **The view side:** one builder table typed `Record<KindId, Builder>` (or `Partial` only for kinds declared to have no 3D form, such as pure model blocks), so a kind without a builder is a compile error, not a silent "no 3D form". The magic room, CAD views, dev rooms and plant rooms all build from it.

Together they form the registry of object kinds, each entry giving:

1. **Identity:** the kind's id, name, class (`object-class.ts`), maker and product (`brands.ts`), what it is modelled after; the catalogue reads it.
2. **How it fits the world, minimally:** its mounting (`floor`, `wall`, `ceiling`, `desk`, `hanging`, `in-line` for valves and fittings, `on-another` for a part on a panel), its footprint and height, and where it attaches (a wall's height, a desk's top); from which any host can place it. Its front is its own +z, as the look links and inspection already assume.
3. **How to build it:** one builder, `build(kit, ctx)`, where `ctx` gives what a host provides: the world to read and act on (the live one in a room, a fresh or stand-in world in the magic room, the bench and CAD), its tag and binding if installed, and the host's options. The same builder makes it in a plant room, a dev room, the magic room and the CAD views: no adapter, no special case.
4. **Its behaviour with the world:** its world binding (what it reads, which world actions its controls drive), registered once here rather than in `world-bindings.ts` beside it; 131's descriptor for it (parts, controls, presets) attached here, so the item audit, the text mode (128) and the magic room's knob (130) read one place.
5. **Optional extras, never required:** curated looks and display pages for the magic room's panel; named parts for `detail` looks; variants (HIGH and LOW, 135).

**Lookup:** by kind id, by installed tag or asset id (through the register), by model node, so a look link, the catalogue, the item audit, the simulation graph (138) and the browser report (134/139/140) resolve an object the same way.

**Consumers changed to use it:**

- the **magic room and the CAD views** build any kind with a builder, placed from its mounting alone; `EXPLICIT` adapters become optional extras on the entry; a kind with no builder (a pure model block) still gets its magic page;
- the **plant rooms' equipment** (`room-equipment.ts`): `MODELS` and the inline special cases become registry entries, so a room places a kind by asking the registry;
- **dev rooms' exhibits** reference registry entries (or are migrated into them), keeping their titles and references;
- **`world-bindings.ts`** and the descriptors are read from the entries, with a test that every placed kind has a binding or is declared passive;
- **the kind catalogue (126), the item audit (130), the room audit (129)** read identity and behaviour from it.

## Rules

- **No new registration step for consumers:** adding a kind is one entry; every host can then place it. A test fails if any placed kind (in any room's layout or exhibits) has no entry, or an entry no builder.
- **Behaviour stays in the model:** the builder binds to the world through its `ctx`; it holds no world state of its own (CLAUDE.md's one-world rule).
- **Placement stays the layout's and the plumber's:** mounting and footprint inform placement; they never place valves or pipes outside the schematic.
- **Migrate, don't fork:** move existing entries over room by room, keeping every room, test and look link working at each step.

## Order of work

1. Inventory: every kind, where it is built, keyed, bound and described today; the key mismatches (`watershed-pool-temperature-controller`); kinds with no 3D builder.
2. The registry's types and lookup, with tests; the pool temperature controller, the weather station, the CM6 and a pump set as the first entries, proving one builder in a plant room, a dev room, the magic room and the CAD views.
3. The magic room and CAD views on the registry (the owner's complaint first); then `MODELS` and the room builder's special cases; then bindings and descriptors; then dev rooms' exhibits.
4. The coverage test, and `doc/agent-tooling.md` updated (how to add a kind).

## Coordination

This touches files many agents work in (`room-equipment.ts`, `magic-adapters.ts`, `world-bindings.ts`, the dev rooms, the kind catalogue). Claim on the mailbox and work in small, independently green steps; missions 144 and 146 (pool temperature control) are in flight in `room-equipment.ts`, `boiler.ts` and `magic-adapters.ts`: wait for them to land.

## Records

The plan in `doc/plans/147-object-registry.md`; the CHANGELOG under Unreleased (`### Changed`); `TODO.md`: this mission and the migration room by room; `doc/agent-tooling.md`.
