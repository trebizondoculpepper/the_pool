# 172 plan: traits as a hierarchy, managed from the command line

Status: design (2026-11-04), revised after Codex's second opinion (see the end), for the owner. Tools mission, separate from the passes that use it (169 registration, 170 classification). Builds on 168 (kind files, the audit command) and 171 (the registry as data).

## The owner's asks (2026-11-04)

- Traits compose: a **software box** trait inherits from **holdable** and **box-like**, and every software box then has the same traits.
- More kinds of trait than shape: **cylindrical** (filters, vessels: not perfect cylinders, but cylinders in the game world); traits with no immediate model impact, such as **powered** (when its power is cut, its mode changes).
- Traits imply metadata: a cylinder has an axis; a floor-standing thing has a floor plane, which may need no configuration.
- Everything the audit and classification need is done by the command line, with no browser: create a trait from others, remove one (refused while in use, listing who uses it), list the kinds with a trait, and so on.

## 1. Two levels of trait

- **Primitive traits** are the ones code gives meaning to. Each is defined once in code (`src/game/plant/traits.ts`, replacing `TRAITS`/`TRAIT_WORDS`) with: its name, description, **facet** (below), the metadata it implies (with defaults), the flags it implies, and the primitives it conflicts with. Adding a primitive is a code change, deliberately: it means new game behaviour.
- **Composite traits** are data: one JSON file each, `src/game/plant/traits/<trait>.json`, listed by `traits/index.ts` (the kinds' arrangement): `{ "description": "…", "extends": ["holdable", "box-like"] }`. A composite extends primitives and other composites; it adds no meaning of its own beyond the bundle (and optional metadata defaults, §3). Anyone can define one through the command.
- **Addition only** (the owner, 2026-11-04): a kind's traits are the plain union of what it names and what those expand to; nothing is subtracted. An exception is a different composite. This keeps the model simple and maps directly onto TypeScript's own composition (a kind's resolved affordances are an intersection of its traits' types).
- A kind's `traits` may name either. Its **expanded traits** are the transitive closure down to primitives; flags, validation and behaviour use only the expanded set. `show` prints both.

## 2. Facets: what a primitive is about

Primitives are grouped by facet so the vocabulary stays orderly and conflicts are easy to state:

| Facet                                   | Primitives (first set)                                                                                                         | Rule                                                                                | Model impact                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **form** (its shape in the world)       | `box-like`, `cylindrical`, `panel-like` (a thin slab: a sign, a panel's face), `run-like` (pipe, cable, duct)                  | at most one                                                                         | collision shape, surfaces                                                         |
| **support** (what holds it up)          | `floor-standing`, `wall-mounted`, `ceiling-mounted`                                                                            | exactly one once classified (missing is a finding until pass 2 ends, then an error) | placement, origin                                                                 |
| **connection** (how it joins the plant) | `in-line` (sits in a pipe or cable run), `terminal`                                                                            | at most one; optional                                                               | the plumber and graph                                                             |
| **handling** (how the player moves it)  | `fixed`, `holdable` (picked up and carried; the old `portable`), `luggable` (shifted, not carried)                             | exactly one; `fixed` if none                                                        | pick-up, moving                                                                   |
| **use** (what the player gets from it)  | `operable` (working controls), `sittable` (the old `chair-like`), `readable` (hover context: a sign, gauge or display to read) | any number                                                                          | clicks, seats, context                                                            |
| **service** (what it depends on)        | `powered`, `water-fed`, `gas-fed`, `networked`                                                                                 | any number; descriptive only                                                        | none yet: recorded, later checked against the simulation graph (138)              |
| —                                       | `decorative`                                                                                                                   | alone with form and support                                                         | seen and nothing else: no context, no clicks, no handling but `fixed`, no service |

So a large cuboidal water tank is `box-like`, `supportable`, `walkable`, `container`, `floor-standing`, `fixed` (the owner's example, 2026-11-04); a sign is `panel-like`, `wall-mounted`, `readable` (not decorative: it has hover context); a pipe is `run-like`, `ceiling-mounted` or `wall-mounted`, `in-line`; a software box is `box-like`, `floor-standing` (on whatever it rests on), `holdable`.

Renames (the owner chose the new names, 2026-11-04): `portable` → `holdable`, `chair-like` → `sittable`. `box-like` no longer implies a top that bears anything: that is `supportable` and `walkable`, said separately.

## 3. Traits imply metadata, mostly with no configuration

Each primitive declares the metadata it implies, its type, and a default. A kind stores a value only where it differs from the default; `show` prints the resolved values and where each came from (default, composite, kind).

- **The world is y-up, in metres** (Three.js; one scene unit is one metre). The floor is the plane y = 0 of the room.
- **Origin: a per-support default, overridable, then audited.** The convention is not universal (Codex found the Wash-O-Tron built centred and hung at a chosen height; room placement can also add a stand below a machine). So each support primitive declares `origin` with a default: `floor-standing` → `base` (its local y = 0 plane is the floor: no configuration, the case for most floor plant, the multiport filter, the waste bin, the software box); `wall-mounted` → `centre` with `height` taken per placement from the room layout (not one per kind); `ceiling-mounted` → `top`. A kind built otherwise sets `origin=centre` or `base=<offset>`. An **origin audit** (one-off machinery, in the magic room's bench, one kind at a time) measures each built object's bounds and lists kinds whose declared origin does not match; the command line then fixes them.
- `in-line`: the axis along its run (`x` default).
- `cylindrical`: `axis` (`y` default: an upright vessel or filter; `x` or `z` for one lying down); radius and length come from its bounds, not configuration.
- `box-like`: its bounds; a better `box` only if declared (168's shape field moves here).
- `sittable`: `seatHeight` and `look` (default +z), the existing seat metadata.
- `powered`: descriptive only, no behaviour claimed: it records that the kind depends on electricity (`supply` optional). Where the simulation model already knows the dependency (the electrical model knows what is fed), the audit compares the two and reports mismatches, rather than the trait inventing behaviour.
- Composites may set metadata defaults for what they contain (an `upright-filter` composite: `cylindrical` with `axis: y`).
- **Precedence:** a kind's own value, else the nearest composite's, else the primitive's default. Two parents of one composite giving different defaults for one key is refused unless the composite sets its own value. `trait edit` re-resolves every descendant and refuses if any would become invalid.

## 4. The resolver: traits drive the game

Today `equipment-kinds.ts` drops `traits` and `mount` when it builds the registry, and `resolveKindAffordances` still works from 158's separate flags (Codex). 172 adds one pure resolver: a kind's expanded traits and resolved metadata → its affordances (interaction from use, portable and luggable from handling, solid and shape from form, put-down from `supportable` and standing from `walkable`, seat from `sittable`'s metadata). **Migration gate:** a kind with traits is resolved from them; a kind without traits keeps its old `affordances`/`mount` until pass 2 classifies it, when those fields are removed by the command. A test compares old and new flags for every classified kind and lists differences for review.

## 5. The command line: everything without a browser

All through `npm run -s audit --`, with `help` documenting each. New in 172:

| Command                                                                 | Does                                                                                                                                                               |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `traits`                                                                | every trait, primitives by facet then composites, each with its description and how many kinds use it                                                              |
| `trait show <trait>`                                                    | its definition, what it expands to, implied metadata and defaults, conflicts, and the kinds that use it (directly and through composites)                          |
| `trait define <name> --extends a,b --description "…" [--set key=value]` | creates a composite's file and index line; refused on an unknown parent, a cycle, a name already a primitive or a composite, or a bundle whose expansion conflicts |
| `trait edit <name> [--extends …] [--description …] [--set key=value]`   | changes a composite; refused if any kind using it would become invalid (and lists them)                                                                            |
| `trait remove <name>`                                                   | refused while any kind or composite uses it, **listing them**; `--replace-with <trait>` moves those users onto another first                                       |
| `trait rename <old> <new>`                                              | renames a composite (or, recorded, a primitive) and updates every kind using it                                                                                    |
| `kinds --with <trait>` / `--without <facet>`                            | kinds by trait (expanded), or kinds missing a facet (unclassified placement, say)                                                                                  |
| `set <kind> traits+=a,b` / `traits-=a`                                  | add or remove traits without restating the list (`traits=` still replaces)                                                                                         |
| `set <kind> <metadata>=<value>`                                         | set implied metadata (`axis=x`, `seatHeight=0.45`, `origin=centre`); refused if no expanded trait implies that key                                                 |
| `unset <kind> <metadata>`                                               | back to the inherited or default value                                                                                                                             |
| `trait edit … --dry-run`, `trait remove … --dry-run`                    | preview: every kind and composite affected, and any that would become invalid, without writing                                                                     |
| `check [--kind <k>] [--room <r>]`                                       | runs every validation CI runs (kinds, traits, index, conflicts, missing facets) and prints problems; exit 1 if any                                                 |
| `unclassified [--room <r>]`                                             | kinds or a room's kinds with no traits, or missing a placement                                                                                                     |
| `find <words>`                                                          | search kinds and traits by id, type, purpose and description                                                                                                       |

Every trait edit validates the whole graph (all composites and kinds), not only the changed file. Reading commands from 167/168 stay (`room`, `kind`, `index`, `rooms --by-size`, `show`, `register`, `bind` …). Every command prints what it changed; all writes are atomic; agents never edit the files by hand.

## 6. Validation and CI

`check` and the test suite run the same pure validator: every trait name resolves; no cycles; composites' expansions conflict-free; every kind's expanded set obeys the facet rules; metadata keys are implied by an expanded trait and have the right type; index and directory agree for both kinds and traits; the traits' index gathers their files exactly as the kinds' does, so additions and removals refresh in the dev server, the command and CI (tested for both).

## 7. Migration from 168's flat traits

The flat traits shipped in 168 map onto primitives (`box-like` → form, `chair-like` → `sittable`, `portable` → `holdable`, `panel-like`, `run-like`, `operable`, `luggable`, `decorative`); no kind has traits yet (pass 2 has not started), so the rename costs nothing now. `mount` (168) becomes the support facet plus its `origin` metadata.

## 8. What it unlocks for 170

Pass 2 becomes: define a small library of composites (software box, office chair, upright filter, wall instrument, control cabinet, pipe run…), then give each kind one or two of them; `unclassified` and `kinds --without placement` show what is left.

## Second opinion (Codex, 2026-11-04) and what changed

Codex agreed with primitives in code and composites as data, and asked for: the resolver that makes traits drive the game (added, §4, with a migration gate); no blanket origin convention (now a per-support default, an override and an origin audit, §3); sharper facets (`in-line` moved to a connection facet, handling exactly one, `decorative` defined against `readable`, §2); metadata precedence, metadata reset, dry-run previews and whole-graph validation (§3, §5); service traits descriptive only (§3). All adopted.

## Open questions for the owner

1. Should service traits (powered, water-fed) be derived from the simulation model where it already knows (the electrical model knows what is fed), with the trait only for what the model does not cover?
