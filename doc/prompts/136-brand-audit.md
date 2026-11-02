# 136: The brand audit, and unbranded goods

The owner, 2026-11-02. Brief only; plan, don't implement, until the owner says. Read `CLAUDE.md`, then 126 (the universal catalogue), 129, 130 and 131.

## Why

Brands are an important part of the game's lore. Everything in the back rooms comes from somewhere: every machine, instrument and fitting carries its maker's brand (`CLAUDE.md`; `src/toolkit/components/core/logic/brands.ts`), except perhaps the most trivial things, such as fuses. A brand's products share a consistent design language. The brand audit shows each brand with everything it makes in the game, so its look can be kept consistent and its gaps found; the unbranded goods page shows what has no maker, so each item is either given one or confirmed generic.

## The brand audit page

A development page per brand, reached from a new **Brands** category in 126's universal catalogue (beside Rooms and Game objects), showing, at the top, what dev8 (`DEV8 · BRANDS AND LOGOS`, `src/toolkit/gallery/rooms/brands-room.ts`) shows today, from the `Brand` record:

- its logo (its `mark`) and its logotype (its `wordmark`, in its `type` and `colours`);
- its motto (`tagline`) and its `promise`;
- when it was founded (and went defunct, if it has), its country, and what it makes.

Below that, **every model in the game associated with that brand**: each kind that carries the brand (126's `kindCatalogue` maker), with its copies and rooms (126's counts), a link to its item audit (130) and, where it has one, its CAD views (133). Grouped by what they are (pumps, controls, signs), so its design language can be compared at a glance.

## The unbranded goods page

One page, also in the Brands category, listing every kind that is not associated with any brand: 126's `no-maker` finding gathered in one place, with copies and rooms. Expected to be mostly generic items (fuses, light switches, sockets), many of them architectural components (the owner's class, 2026-11-02). Each entry is either a gap (an engineering item that should have a maker: a finding) or confirmed generic: a short list in data, with the reason, of kinds the owner accepts as unbranded, shown apart.

## Built from data

Like the catalogue, from data alone (`brands.ts`, `kindCatalogue`, the register), never by building a scene, so it opens quickly. dev8's drawing of a logo and logotype is reused for the page, not redrawn by hand.

## Acceptance

- Every brand in `brands.ts` has a page, with its mark, logotype, motto and details as dev8 shows them, and every kind that carries it.
- A brand with no kind in the game is shown as such (a brand in the lore with nothing placed yet).
- The unbranded page lists every kind with no maker, split into gaps and confirmed generic.
- Pure parts (grouping, counts, the generic list) live in `logic/` with tests beside them.

## Records

The plan in `doc/plans/136-brand-audit.md`; `TODO.md`; `CHANGELOG.md` under Unreleased once built; a diary entry.
