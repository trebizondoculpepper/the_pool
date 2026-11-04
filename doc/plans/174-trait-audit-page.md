# 174 plan and spec: traits on the item audit, and a trait audit page

Brief: [`doc/prompts/174-trait-audit-page.md`](../prompts/174-trait-audit-page.md). Spec written by `nicole_buruaah`, 2026-11-04, from the code as it stands (missions 130, 145, 168–173). The implementing agent may change details that turn out wrong in the code, recording why here; the owner's test (below) is fixed.

## The owner's test

The balance tank's item audit (`bench.html?bench=item-audit&kind=balance-tank`) shows that it is box-like, floor-standing, supportable, walkable and the rest. Clicking a trait opens its page: what it means, its sub-traits and their expansion to primitives, and every other kind and object that has it, so a misfit ("this isn't box-like") stands out and is one command from fixed.

## What exists to build on (2026-11-04)

- `src/game/plant/traits.ts` (pure):
  - `FACETS`, `FACET_RULES[facet].words`; `PRIMITIVES[name]`: `{ facet, words, implies?, conflicts?, meta?, needs? }`; `PRIMITIVE_NAMES`, `isPrimitive`, `primitive`.
  - Primitives today: form `box-like`, `cylindrical`, `panel-like`, `run-like`; surface `supportable`, `walkable` (walkable implies supportable); support `floor-standing`, `wall-mounted`, `ceiling-mounted`, `in-line`, `terminal`; handling `fixed`, `holdable`, `luggable`; use `operable`, `sittable`, `readable`; role `container`; service (derived) `powered`, `water-fed`, `gas-fed`, `networked`; `decorative`. (Read the list from `PRIMITIVES`, never hard-code it.)
  - `CompositeTrait`: `{ description, extends: string[], meta? }`; `compositeTraits()` (by name, from `src/game/plant/traits/<t>.ts` via `traits/index.ts`; only `floppy-disk` today).
  - `expand(traits, composites)` → `{ primitives, problems, via }` (`via[primitive]` = the path it came by); `metaSpecs`, `resolveMeta`; `serviceTraits(media)` (power → powered, water → water-fed, gas → gas-fed, signal → networked).
- **Kinds:** `src/game/plant/kinds/<kind>.ts` (`defineKind`: `traits?`, `mount?`, `meta?`, …), compiled by `kind-files.ts` and read by `equipment-kinds.ts` (`EQUIPMENT_KINDS`, `KindId`). Only `floppy-disk` names traits today.
- **Service traits** are derived from the simulation graph in the CLI only: `scripts/audit-edit.ts` (about lines 235–245) builds `media` per kind from `graph.edges` (skipping `raises`) and maps it through `serviceTraits`. **This derivation must move into a shared pure module** (below) so the page and the CLI agree.
- **The CLI:** `npm run -s audit -- traits`, `trait show <t>`, `kinds --with <trait>`, `kinds --without <facet>`, `unclassified`, `set <kind> traits=… | traits+=… | traits-=…` (`scripts/audit.ts`, `audit-edit.ts`, `audit-help.ts`).
- **Pages:** `src/toolkit/gallery/views/item-audit-page.ts` (130; `itemAuditLink(kind)` in `logic/item-audit.ts`; placements via `groupPlacements(kind.copies)` from `kindCatalogue()`, each ref now linking to `objectDetailLink(room, ref)`, `logic/object-detail.ts`); `src/bench.ts` routes `?bench=…`; the bench index's page registry (`logic/page-registry.ts`, `registerPage`; `logic/bench-pages.ts`); CAD view thumbnails (133, `views/cad-views.ts`, cached in IndexedDB).

## Design

### 1. A shared pure trait index: `src/game/plant/trait-index.ts` (new, tested)

One module both the CLI and the pages call. No DOM, no Three.js, no file system.

```ts
export type TraitSource =
  | { by: 'named' } // the kind's own file names it
  | { by: 'composite'; via: string[] } // through these composites, outermost first
  | { by: 'implied'; from: string } // a primitive's `implies` (walkable → supportable)
  | { by: 'ports'; media: string[] }; // a service trait, from its ports' media

export interface KindTrait {
  trait: string;
  primitive: boolean;
  facet?: Facet;
  sources: TraitSource[];
}

/** A kind's traits: what it names, and the full expansion, each with how it got it. */
export function traitsOfKind(
  kind: KindId,
  ctx: TraitContext,
): {
  named: string[];
  expanded: KindTrait[]; // primitives and composites, de-duplicated, sorted by facet then name
  problems: TraitProblem[];
};

/** One trait's page data. */
export function traitDetail(
  trait: string,
  ctx: TraitContext,
): {
  name: string;
  kind: 'primitive' | 'composite' | 'unknown';
  facet?: Facet;
  facetWords?: string;
  words: string; // primitive.words or composite.description
  meta: { key: string; spec: MetaSpec; value?: string | number }[];
  composedOf: TraitTree; // composite: its extends, recursively, to primitives
  expandsTo: PrimitiveName[]; // composite: expand([trait]).primitives
  implies: string[];
  conflicts: string[];
  needs?: Facet; // primitive
  includedBy: string[]; // composites whose expansion contains it
  kinds: { kind: KindId; sources: TraitSource[] }[];
};

export interface TraitTree {
  trait: string;
  primitive: boolean;
  children: TraitTree[];
}

/** Every trait, by facet, with counts (what `audit -- traits` prints). */
export function traitIndex(ctx: TraitContext): {
  facet: Facet | 'composite';
  traits: { name: string; kinds: number; objects: number }[];
}[];

/** The kinds' service traits from the simulation graph (moved from audit-edit.ts). */
export function serviceTraitsByKind(
  graph: SimGraphLike,
): Map<KindId, PrimitiveName[]>;

export interface TraitContext {
  kinds: Readonly<Record<KindId, { traits?: readonly string[] }>>; // EQUIPMENT_KINDS
  composites: Readonly<Record<string, CompositeTrait>>; // compositeTraits()
  services: ReadonlyMap<KindId, readonly PrimitiveName[]>; // serviceTraitsByKind(simGraph())
}
```

- `scripts/audit-edit.ts` switches to `serviceTraitsByKind` and `traitDetail`/`traitIndex` for `traits`, `trait show`, `kinds --with`, so the CLI's output and the page come from the same functions; `trait show <t> --json` prints `traitDetail` as JSON (and `show <kind> --json` includes `traitsOfKind`).
- Objects are counted by joining `traitDetail(...).kinds` with the catalogue's placements (`kindCatalogue()`, `groupPlacements`), in the view-side logic (`src/toolkit/gallery/logic/trait-audit.ts`, below), since the catalogue lives in the gallery.

### 2. The trait audit page

- **Routes** (`src/bench.ts`): `?bench=trait-audit&trait=<t>` (one trait), `?bench=trait-audit` (the index). Link helper `traitAuditLink(trait?)` in `src/toolkit/gallery/logic/trait-audit.ts`, beside `trait-audit.test.ts`; the view in `src/toolkit/gallery/views/trait-audit-page.ts`, using `el`/`table` from `look-audit-page.ts` as the other audit pages do.
- **The index page:** one section per facet (with `FACET_RULES[f].words`), then composites; each trait a link, with its kinds and objects counts, and a "used by nothing" mark.
- **One trait's page,** top to bottom:

```
← Bench index · Traits
box-like                                   primitive · form ("its shape in the world")
  What it means: <words>
  Implies: —   Conflicts: —   Needs: —
  Metadata it implies: origin = base (default) — "<words>"   axis …
Composed of (composite only):  tree of extends, each a link, down to primitives
Expands to (composite only):   the primitives, each a link
Included by:                   composites that contain it, each a link
Kinds with it (N):             table — kind (→ item audit) · how (named / via X › Y / implied by walkable / from ports: water) · objects · thumbnail · fix command
Objects with it (M in R rooms, K outside dev rooms):
                               grouped by room as the item audit groups them — ref (→ object detail) · kind · tag · look
```

- **The fix command** beside each kind, copyable text, never run by the page: named → `npm run -s audit -- set <kind> traits-=<t>`; via a composite → the composite to remove (`traits-=<composite>`) and a note that it removes the composite's other traits too; implied → "implied by <primitive>: remove that"; from ports → "derived from its ports (<media>): change the model, not the trait".
- **Thumbnails:** the kind's CAD perspective view (133) if cached in IndexedDB, else none; never rendered on this page (it would build scenes): lazy, optional, and a page with none is complete.

### 3. Traits on the item audit page

- A section **"Its traits"** placed near the top (after "What it is", before parts), via `ITEM_AUDIT_SECTIONS` as 133's CAD views are, from `traitsOfKind(kind)`: a small table by facet: trait (→ trait page) · primitive/composite · how it has it (named / via … / implied by … / from ports: …). Below it: "Named in its file: …" and the commands to add or remove one (`npm run -s audit -- set <kind> traits+=<t>` / `traits-=<t>`).
- **No traits:** "No traits yet: <kind> is unclassified (mission 170 classifies the registry)", linking to the trait index and listing the facets it lacks (`kinds --without`).
- **Problems:** `traitsOfKind(...).problems` (an unknown name, a cycle, a facet rule broken) shown in red, as the audits show findings.

### 4. Reachable

- The bench index (137): a **Traits** group (or under Things), registered with `registerPage` in `logic/bench-pages.ts`: the index and every trait.
- The `?dev` catalogue's kind rows (`views/catalogue-panel.ts`): each kind's traits as small links.
- `doc/agent-tooling.md`: the pages, `traitAuditLink`, and `trait show --json`.

### 5. The worked example: classify the balance tank

Before the page work, with mission 170's owner's agreement (they hold the registry pass), classify `balance-tank` through the command only:

`npm run -s audit -- set balance-tank traits=box-like,floor-standing,walkable,container,fixed`

(`walkable` implies `supportable`; `water-fed` comes from its ports; check `check` passes and the facet rules: one form, exactly one support, exactly one handling.) Commit that change on its own, crediting 170. If another kind already shares these, its page shows it ("what else is box-like").

## Configuration: some traits need it, others don't (the owner, 2026-11-04)

The owner: "some traits require configuration, others don't." In the code a primitive's configuration is its `meta` (`Primitive.meta`, a `MetaSpec` each: `type` number, enum or text; `values` for an enum; an optional `default`; `words`). On 2026-11-04 the configurable primitives are `cylindrical` (`axis`), `floor-standing` (`origin`, `base`), `wall-mounted` (`origin`), `ceiling-mounted` (`origin`), `in-line` (`runAxis`) and `sittable` (`seatHeight`, `look`); the rest (box-like, walkable, container, fixed, operable and so on) take none. A composite may set values for what it contains (`CompositeTrait.meta`), and a kind may set its own (`set <kind> origin=centre …`); `resolveMeta(traits, own, composites)` returns each key's value and where it came from, with problems (two composites at one depth disagreeing).

So the pages must show configuration as a first-class part of a trait:

- **The trait page:** a "Configuration" section: "none" for a trait that takes none; otherwise each key with its type, allowed values, default, words, and **required** when it has no default (the kind must set it), or **optional** with its default. A composite shows the values it sets, and the configuration its expansion brings.
- **The trait index:** a mark on each configurable trait (for example "⚙ origin, base"), so the owner sees at a glance which traits need configuring.
- **The item audit's "Its traits":** for each configurable trait the kind has, its resolved values (`resolveMeta`) and where each came from: the kind itself, a composite (named), or the default; a **required value missing** is a finding in red (the kind is not fully classified), with the command to set it (`npm run -s audit -- set <kind> <key>=<value>`); disagreeing composites shown as the problem `resolveMeta` reports.
- **The trait index module:** `traitDetail` gains `configuration: { key, spec, required }[]` and `traitsOfKind` gains `config: { key, value?, from: 'kind' | 'default' | string /* composite */, required, missing }[]` per trait, both from `metaSpecs` and `resolveMeta`, so the CLI's `trait show` / `show <kind>` (and their `--json`) print the same.
- **Tests:** a trait with no configuration; one with an optional key (default used); one whose required key is missing on a kind (a finding); a value from a composite; a value set on the kind overriding a default.
- **The worked example:** the balance tank's `floor-standing` shows `origin` and `base` with their values and sources.

## Stages

1. `trait-index.ts` with tests; `audit-edit.ts` moved onto it (output unchanged, but `--json`); `npm run -s audit -- check` still passes.
2. The balance tank classified (5), as its own commit.
3. The trait audit page and its route and link helper, with tests for the pure join (`trait-audit.ts`).
4. "Its traits" on the item audit page; the catalogue's links; the bench index registration.
5. Browser checks and screenshots; `doc/agent-tooling.md`; TODO and CHANGELOG.

## Tests

- `trait-index.test.ts`: `traitsOfKind` for a kind with named primitives, a composite (`floppy-disk`), an implied primitive (walkable → supportable), a port-derived service, an unknown name (a problem, not a throw); `traitDetail` for a primitive, a composite (tree, expansion, included-by), an unknown trait; `traitIndex` counts; `serviceTraitsByKind` on a small graph (and `raises` edges ignored).
- `trait-audit.test.ts`: objects joined from placements by kind; grouping by room; the fix command for each `TraitSource`.
- The CLI: `trait show box-like --json` equals `traitDetail('box-like', ctx)`.
- Browser (recorded in this plan): the balance tank's item audit lists box-like, floor-standing, supportable (implied by walkable), walkable, container, fixed and water-fed (from ports), each linking on; `box-like`'s page lists the balance tank among its kinds and its objects (PL1-T1 in plant room 1 and the others), each object opening its detail page and from there its look; `floppy-disk`'s page shows its tree; the index lists every trait with counts; a kind with no traits says so.
- `npm run typecheck`, `npm run lint`, `npm run format:check`, the targeted tests (`--maxWorkers=2`), `npm run build`, one full `npm test` announced on agent-inbox (one per machine).

## Files

New: `src/game/plant/trait-index.ts` (+ test), `src/toolkit/gallery/logic/trait-audit.ts` (+ test), `src/toolkit/gallery/views/trait-audit-page.ts`. Changed: `scripts/audit-edit.ts` (and `audit.ts`/`audit-help.ts` for `--json`), `src/bench.ts`, `src/toolkit/gallery/views/item-audit-page.ts`, `src/toolkit/gallery/logic/bench-pages.ts`, `src/toolkit/gallery/views/catalogue-panel.ts`, `src/game/plant/kinds/balance-tank.ts` (by the command only), `doc/agent-tooling.md`, `TODO.md`, `CHANGELOG.md` (`### Added`). Claim them on the mailbox first: the registry and the audit CLI are `ahnaa_dmitrieva`'s (172, 173) and mission 170 is assigning traits.

## As built (2026-11-04, ahnaa_dmitrieva)

- Built as specified, with these changes: `serviceTraitsByKind` takes port media (`mediaByKind(graph)` first), so the CLI and the page share the media too; `traitIndex` counts kinds only (objects are counted on each trait's page, from the catalogue); `kinds --with` uses `traitDetail` as well. The item audit's section is placed directly after What it is (not through `ITEM_AUDIT_SECTIONS`), with a note when a kind has no support trait.
- Not built: CAD thumbnails on the trait page (optional in the spec; the item audit, one link away, has them).
- Browser check: the balance tank's item audit lists box-like, supportable (implied by walkable), walkable, floor-standing, fixed, container and water-fed (from ports), each linking on; `box-like` lists the balance tank and its three objects (PL1-T1, PL2-T1, PL3-BT1), each opening its object detail page; `floppy-disk` shows its tree and expansion; the index lists every facet and the composites.
