# Plan 136: the brand audit, and unbranded goods

Brief: `doc/prompts/136-brand-audit.md`. Machinery only, built from data, no scene built; proved on a few brands and the unbranded page.

## Data

Everything comes from 126's `kindCatalogue` (with the dev rooms' exhibits loaded by `loadExhibits`, as the catalogue and the item audit load them) and `BRANDS` in `brands.ts`. A kind carries a brand when its maker (the register's, its model exhibit's, or every copy's) is the brand; a kind whose copies name several makers is listed under each, with only the copies that carry it, marked "shared with other makers".

## Pure parts: `src/toolkit/gallery/logic/brand-audit.ts`

- `brandModels(brand, kinds)`: the kinds carrying the brand, each with its copies and rooms.
- `groupByClass(items, kindOf)`: grouped by the kind's class (`object-class.ts`: plant, non-plant, architectural, decorative, unclassified dev exhibits), in `CLASS_ORDER`, each by its word.
- `brandAudit(brand, kinds)`: the groups, kind and copy counts, and `nothingPlaced` (a brand in the lore with no copy placed).
- `unbranded(kinds, generic)`: every kind with no maker at all, decoration exempt (as 126 has it), split into `gaps` (findings) and `generic` (the owner's `CONFIRMED_GENERIC`, each with its reason), plus `stale` generic entries (now branded, or gone).
- `CONFIRMED_GENERIC`: starts empty. The brief's examples (fuses, light switches) are not kinds in the catalogue yet, so nothing is seeded; the owner names each entry.
- `brandAuditLink`, `UNBRANDED_LINK`, `brandCounts`.

Tests beside it (`brand-audit.test.ts`): fixtures for grouping, shared kinds, nothing placed, the split and stale entries; and over the real catalogue that every brand has counts, the generic list has no stale entry, and each unbranded kind appears once.

## Pages: `src/toolkit/gallery/views/brand-audit-page.ts`

- `bench.html?bench=brand-audit&brand=<id>`: the brand's sheet drawn by dev8's own `drawBrandSheet` (`brand-logo.ts`) onto a canvas (mark, logotype in its type and colours, motto, facts, palette), a details table (name, logotype, mark, motto, promise, founded and defunct, country, makes, colours), then its models grouped by class, each with copies, rooms (linked) and links to its item audit (130) and, where it has a 3D form (`adapterFor`), its CAD views (133, at the top of the item audit). A brand with nothing placed says so. `window.__brandAudit`.
- `bench.html?bench=brand-audit`: every brand with its kinds and copies.
- `bench.html?bench=unbranded`: gaps and confirmed generic, grouped by class, with copies, rooms and links. `window.__unbranded`.

## Catalogue

A third tab, **Brands**, in the `?dev` catalogue (`catalogue-panel.ts`): Unbranded goods first, then each brand linked to its page with what it makes and its counts; the search box filters by name, id and what it makes.

## Records

`doc/agent-tooling.md`, `TODO.md`, `CHANGELOG.md` (Unreleased, Added), a diary entry. No counts or findings are recorded in docs: the pages are the record.
