# 174: Traits on the item audit, and a trait audit page

The owner, 2026-11-04, on the item audit page (`bench.html?bench=item-audit&kind=balance-tank`): "Does it say what traits the item has? Each trait should go to a trait audit page, which shows what sub-traits compose that trait, and what objects in the game world have that trait." `nicole_buruaah` wrote this brief; it builds on `ahnaa_dmitrieva`'s trait system (missions 172 and 173), so she is its natural owner. Brief only; not started until the owner says.

Read first: `CLAUDE.md`, `doc/agent-tooling.md` (the bench pages, the object detail page, `npm run audit`), `doc/plans/172-trait-hierarchy.md`, and the brief and plan of mission 173. Claim files on agent-inbox; stage only your own hunks through a private index; don't spawn sub-agents without the owner's permission.

## What there is now (checked 2026-11-04)

- **Traits** (`src/game/plant/traits.ts`, missions 172–173): primitive traits in facets (form, surface, support, connection, handling, use, role, service, decorative; `FACET_RULES`, `PRIMITIVES`), composite traits as data, one typed file each (`src/game/plant/traits/<trait>.ts`) bundling primitives and other composites, `expand()` resolving a kind's full set; service traits derived from the model's ports, never set by hand.
- **Kinds** (`src/game/plant/kinds/<kind>.ts`, `defineKind`): a kind may name `traits`; on 2026-11-04 only `floppy-disk` names any, and assigning traits and mounting to the rest is mission 170 (pass 2). The page must work, and be useful, while most kinds have none.
- **The command line** already answers these questions for agents: `npm run audit -- traits` (all, by facet, with use counts), `trait show <t>`, `kinds --with <trait>`, `kinds --without <facet>`, `unclassified`.
- **The item audit page** (`src/toolkit/gallery/views/item-audit-page.ts`, mission 130; its placements now link to each object's detail page) says nothing of traits. There is no trait page.

## What to build

1. **Traits on the item audit page:** a "Its traits" section near the top: the traits the kind names itself, and its full expanded set (`expand()`), grouped by facet, each marked primitive or composite and whether it is named, inherited through a composite, or derived from ports (service traits); each trait a link to its trait audit page. A kind with none says so and links to the unclassified list (and names mission 170).
2. **A trait audit page,** `bench.html?bench=trait-audit&trait=<t>` (and `bench.html?bench=trait-audit` alone: every trait by facet, with its use counts, as `npm run audit -- traits`):
   - **What it is:** its name, primitive or composite, its facet, its description, the metadata it implies with defaults (`MetaSpec`).
   - **What composes it:** for a composite, the traits it extends, each a link, down to the primitives (a small tree), with any metadata it sets.
   - **What includes it:** the composites that extend it, each a link (up the hierarchy).
   - **The kinds that have it:** directly named, or through a composite (say which), or derived from ports; each a link to its item audit.
   - **The objects in the game world that have it:** every placement of those kinds, grouped by room as the item audit groups them (counted from data, 126's catalogue), each a link to its object detail page (`objectDetailLink`, 145) and on from there to its look views; with the totals (objects, rooms, outside dev rooms).
3. **Built from data alone,** never from a scene: the pure parts in `src/toolkit/gallery/logic/` (tested beside them), sharing the command line's functions rather than duplicating them (`traits.ts`, the audit CLI's kind and trait queries, `kindCatalogue`, `groupPlacements`).
4. **Reachable:** registered in the bench index (137's page registry) under Things (a Traits group, or traits under each kind), and linked from the catalogue panel's kind rows; `npm run audit -- trait show <t> --json` (or the existing JSON form) gives the same content to agents, so the page and the CLI cannot disagree.

## The owner's test (2026-11-04)

"If this works well, I should be able to see that the balance tank (`bench.html?bench=item-audit&kind=balance-tank`) is box-like, supportable, walkable, etc. Clicking each of those traits should give me a description of what that trait means (its sub-traits and expanded primitive traits), and what other objects implement that trait: what other things are box-like? That would be a good way to check, especially if I looked at that object and found that it wasn't box-like."

So:

- **The balance tank is the worked example.** Its traits are not yet assigned (mission 170). With 170's owner, classify it first, through the command (`npm run -s audit -- set balance-tank traits=…`), as normal practice for a sectional tank says: `box-like` (form), `floor-standing` (support), `supportable` and `walkable` (its roof bears weight and is walked on: mission 151), `container`, `fixed`, and its service traits derived from its ports (`water-fed`). Its item audit then shows each, by facet, each a link.
- **Each trait page explains itself:** what the trait means in words (its description and its facet's), whether it is a primitive or a composite, its sub-traits and their full expansion down to primitives, and the metadata it implies, so the owner can tell what "walkable" promises in the game (for example: the walker can stand on its top).
- **"What else is box-like?":** the trait page lists every kind and every object in the world with it, each with a thumbnail where 133's CAD views or a look exist, and a link to its item audit and object detail, so a wrongly classified object stands out at a glance.
- **Correcting a wrong one:** beside each kind on a trait page, show the exact command that would remove the trait from it (`npm run -s audit -- set <kind> traits-=<trait>`), and on the item audit the command to add or remove one, so a misfit spotted on the page is one command away from fixed (the page stays read-only; the registry is changed only by the command, as 168 rules).

## Tests and checks

- Pure: a composite's expansion and its tree; the reverse (what includes a trait); kinds with a trait directly, by composite and by ports; placements grouped by room; a trait used by nothing; a kind with no traits.
- In the browser: the balance tank's item audit (box-like, floor-standing, supportable, walkable and the rest, after classifying it; a kind still without traits says so and links to unclassified); `floppy-disk`'s item audit (its traits, each linking on); a composite's trait page (its tree down and up, its kinds, its objects, each object opening its detail page and from there its look). Screenshots in the plan.
- `npm run typecheck`, `npm run lint`, `npm run format:check`, the targeted tests (`--maxWorkers=2`), `npm run build`, then one full `npm test` announced on agent-inbox (one full run per machine).

## Records

The plan and spec in [`doc/plans/174-trait-audit-page.md`](../plans/174-trait-audit-page.md) (written with the brief, 2026-11-04; follow it, recording any change); the CHANGELOG under Unreleased (`### Added`); `TODO.md`: this mission, ticked with its date and commit; `doc/agent-tooling.md`: the trait audit page and its link from the item audit.
