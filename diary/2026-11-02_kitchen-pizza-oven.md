# Development Diary Entry - 2026-11-02

## Context

- **Date**: 2026-11-02 UTC
- **Branch**: main
- **Contributors**: Claude Code + the owner

## Problem Statement

The owner asked for a new dev room for kitchen things, its first and only item a Moretti Forni pizza oven: twin deck, stood on a heat cupboard, on four lockable wheels; begin by looking up the product and make a reference model. The owner then chose the Amalfi's style (serieP) over the iDeck first looked at.

## Our Approach

Research first (`doc/research/pizza-oven.md`): Moretti's Amalfi D datasheet has a drawing of exactly the configuration asked for, two 18 cm chambers on the 800 mm prover on castors, 1520 × 1365 × 1850 mm, and the serieP manual names every item on each chamber's two panels and the prover's. A new maker, Mozzetti Forni S.p.A., stands in for Moretti (its mark a red roof's chevron over the oven's glowing mouth). The model, the Ravello D, is a new `components/kitchen/` category: figures and what the panel shows as pure logic, the view drawn to the datasheet, its LED readouts and legends drawn once in a sample state. Dev70 · Kitchen is an exhibit room of `plant-room.ts` with its own layout putting the oven out in the floor to be walked round; it shows in the `?dev` catalogue and the component bench by itself.

## Outcomes

Dev70 holds the oven; look links frame it (`?room=dev70&look=pizza-oven-mozzetti-forni-ravello-d`); the component bench passes it within budget. Assumptions (panel legends in English words, all four castors total-lock, the prover's dial scale) are listed in the research note.

## Next Steps

Making the oven work (its switches, keys, thermostats, lamps and heat) and placing kitchen equipment in the leisure centre only when the owner asks: both in `TODO.md`.
