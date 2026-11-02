# 127: Everything lookable: every object in every room has a name a link can reach

The owner, 2026-11-02: "we might be developing a thing, want to see some angles, and then that might be a reminder that we need to put tags on things." The third of three missions: 125 makes look links; 126 lists each room's lookable objects in the dev panel; this one makes every object that matters lookable, finds what is not, and keeps it that way. Briefs only until the owner says go. Read `CLAUDE.md`, `doc/plant-model.md`, and missions 125's and 126's briefs and plans first. Reviewed by Codex 2026-11-02; its corrections are folded in.

## Depends on, in two parts

- **Part A, the audit,** follows 125 (done; it uses 125's resolution and line of sight).
- **Part B, the coverage,** follows 126 (done, `doc/plans/126-object-index.md`), whose catalogue it reads and extends.

## What there is now (checked 2026-11-02)

- **Identities:** `markComponent` (`src/toolkit/components/core/views/component-identity.ts`) marks a scene object with a tag, or a name for a thing with none; its model binding (node, fitting or link); `decorative`; or a `part`. A name without a model binding is allowed: a worded sign or a title card is a named thing, not decoration.
- **No single binder:** the scene is marked by many builders, among them `room-equipment.ts` (placed equipment, about line 1730) and the museum halls (`rooms/museum/hall-1-warm-water.ts`, about line 484, where a pipe and its markings carry the same link). `src/toolkit/gallery/logic/world-in-model.ts` is a pure inventory and binding check over sets of ids; `views/world-in-model-scene.ts` exports `unboundInScene` (line 22), which returns the names of unbound mesh owners, not an inventory; the reusable walk from meshes to their marked look owners is `lookOwners` in `views/look-scene.ts` (line 77). Neither classifies every unmarked mesh yet.
- **The register** covers placed equipment only (`installed-asset-ids.ts`); valves, fittings, pipes, fixtures and museum objects have their identity elsewhere (the model, the room's builders).
- **Not yet built:** `bench.html?bench=lookables` and `npm run look:audit` are deliverables of this mission; `src/bench.ts` serves only `components` today, and `package.json` has no audit script.
- **The component benchmark** (`bench.html?bench=components`, development only, `src/bench.ts`) shows a failed banner, logs errors and leaves its result on `window`; it does not fail `npm test` or the build. `KNOWN_OVER_BUDGET` (`logic/component-bench.ts`) is its list of known performance exceptions.

## Three identities, kept apart

- **The model binding:** what it is drawn from (a node, fitting or link), where it has one.
- **The display tag and asset id:** where the model or the register gives them.
- **The look ref:** how a link names it (125's rules): the tag where there is one, else the model binding or the name. Every lookable object has a look ref; not every one has a tag or a model binding.

## What counts

- **Must be lookable:** every machine, instrument, valve, isolator, panel, mimic, control, display, worded sign, door, title card and exhibit; every pipe run by its link; every museum hall's machines.
- **One target, several pieces:** mission 125's rule (`src/toolkit/gallery/logic/look-ref.ts`, about line 124): owners in a room are grouped by tag first, and by model binding only where they have no tag, into one target with combined bounds (a pipe and its markings under one link). A `#n` suffix is kept for genuinely separate objects that share a name.
- **Named parts:** where a person would ask to see a part close (a display, a keypad, a gauge's dial, a nameplate, a key switch), the component declares it as a named part (`part`), so `detail` reaches it.
- **Worded signs change class:** today `decorativeKind` (`src/toolkit/gallery/logic/world-in-model.ts` about line 149) makes every `sign:*` decorative and `room-equipment.ts` (about line 1733) marks it so. This mission marks a sign with words on it by its name instead (still bound to nothing in the model), and the audit counts a worded sign marked decorative as a finding. The data side changes too: `kindCatalogue` (`src/toolkit/gallery/logic/kind-catalogue.ts`, about line 207) marks signs `look: 'none'` and exempt, so a worded sign changed only in the scene would stay absent from the catalogue. One sign classification, shared by the scene marking and `kindCatalogue`, decides which signs are named.
- **Need not be:** architecture (walls, floors, ceilings, coves, door openings), the services ceiling, static set decoration, lights and effects. These are marked (`decorative`, or an architecture mark this mission adds), not left unmarked, so the audit can skip them.

## Part A: the audit

- **What it runs:** a development page beside the component benchmark (`bench.html?bench=lookables`, one room or all), built on `lookOwners` (`look-scene.ts`), with its own lookability classification (a model-bound object is not automatically lookable; a decorative mark must not hide a worded sign).
- **One scanner, shared with 129:** this mission owns the scene scanner (the inventory of every owner and unmarked mesh in a built room, and its classification) and the one room-build adapter that builds a room off-screen for it. Mission 129's room audit uses the same scanner, record and adapter and adds its graph, state and control findings, so the two audits cannot disagree. Say in the plan whether the runner starts a dev server or expects one running (125's capture script expects one).
- **One record per target:** each look target gets a row with its source identity, its constituent owners, its catalogue status, its look result and any exception reason.
- **What it reports,** per room:
  - **unlabelled:** meshes with no marked owner that are not architecture or decoration, grouped under their nearest named ancestor, largest first by bounding volume, ignoring loose unmarked geometry under 5 cm across (a stray mesh the size of a boiler matters; a screw does not); the cutoff never hides a small marked or nameable thing such as a button or a sign;
  - **unreachable:** catalogue (126, `lookCatalogue`) and register entries with no object in the built room, and catalogue entries 126 expects to resolve that do not, excluding entries marked `look: 'none'`; entries marked `unverified` are reported separately;
  - **duplicates:** two separate targets answering to one tag in a room (an error), or to one name (listed, resolved by `#n`); the several marked pieces 125 deliberately combines into one target (`look-ref.ts`, about line 152) are not duplicates;
  - **bad fronts:** targets whose `front` look sees under half its rays or whose front faces a wall within 0.3 m.
- **Not a display check:** a target passing the geometry and ray checks is reachable, not proved readable; whether a display shows its content (mission 124's black viewscreen) is a separate check.
- **Where the report goes:** a committed JSON file (`doc/look-audit.json`, with a short Markdown summary beside it), so the dev panel (126) can show each room's unlabelled count without building rooms, and a change in it shows in a diff.
- **How it fails:** `npm run look:audit` (headless Chrome against the dev server, as 125's capture script) runs it, writes the report, and exits non-zero when any room has unlabelled, unreachable or duplicate-tag findings not listed, with its reason, in `KNOWN_UNLOOKABLE` (`logic/look-audit.ts`) and flagged in `TODO.md`. It is run before a commit that adds or moves equipment, as the component benchmark is; making it part of CI is a later step.

## Part B: the coverage

Instrument the builders, not a binder. The order:

1. **Mark architecture and decoration** where rooms are built (the shell, the services ceiling, set dressing), so the first report is about things that matter.
2. **Plant rooms, the boiler house and the control room** (the rooms the owner asks to see most): `room-equipment.ts`, the valves and pipes drawn from each room's network.
3. **Dev rooms,** their exhibits and the objects they place directly (dev0's boards): each room's metadata (titles, kinds, parts) moved into a small pure module beside it, which the room marks its objects from and 126's catalogue reads in place of the room module's `EXHIBITS` (126, rewritten 2026-11-02 as the universal catalogue, left this move to 127).
4. **Museum halls, corridors, the pool halls** and the rest.
5. **Named parts** on the components agents photograph most: the CM6, the mimic boards' readouts, the weather station console, the touch panels, the period PC's screen.

A test compares, room by room, the look targets the catalogue lists with the owners `markComponent` marks, so the two never drift. No tag is invented by hand: an object that should have a tag gets it through the model or the register; one that has no tag is named.

## Shared foundation

Missions 128, 129 and 130 each need one descriptor per kind of what it is made of and how it is worked: its named parts, its control ids, the world action each control drives, its visible readings and its state presets (128's verbs, 129's "controlled by", 130's magic-room presets). This mission's named parts are the first piece of it. Its shape is to be settled with the owner once, not invented separately by each mission.

## Keeping it that way

A rule in `CLAUDE.md`: a new object in any room is lookable, named from the model, the register or the room's catalogue; new components declare their named parts; a new or changed room passes `npm run look:audit`.

## Not in this mission

No change to how a look link chooses its view (125) or how the panel lists (126), beyond the unlabelled count. No world state.

## Open questions for the owner

1. Does 127 finish only when all rooms pass, or may it ship plant and dev-room coverage first, with the remaining rooms tracked in `TODO.md`?
2. The shape of the shared kind/part/control/view-state descriptor (see Shared foundation), and which mission builds it first.

## Records

The plan in `doc/plans/127-everything-lookable.md`, with the first audit's numbers room by room; the CHANGELOG under Unreleased (`### Added`, `### Changed`); `TODO.md`: this mission, `KNOWN_UNLOOKABLE`'s entries, what remains room by room, and the audit in CI as a later step.
