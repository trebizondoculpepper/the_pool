# 130: The item audit, and its magic room

The owner, 2026-11-02. Brief only; not started until the owner says. Read `CLAUDE.md` first, then 125 (look links), 126 (the universal catalogue, whose Game objects category links each item here) and 129 (the room audit, its counterpart for a room).

## What it is for

A close look at one kind of game object (a component kind: a valve, a pump, a mimic board, a weather station console): what it is made of, what states it has, what it looks like in each, and everywhere it has been used. Among its purposes: finding where deprecated or disliked objects are still in use, so they can be replaced, and seeing how an object is used across the building. An object used thousands of times (a valve) gives a long list; that is accepted.

## The item audit page

A development page per game object, linked from its entry in 126's Game objects category, listing:

- **What it is:** its kind, its maker's brand, the real product it is modelled after, its description (derived from the model, as everywhere), and whether it is marked deprecated.
- **Its parts:** each named part (125's part refs), its type, and whether it is properly named by 126's rule; unnamed parts flagged.
- **Its main states:** the states it can show (a valve open, shut or travelling; a pump stopped, running or tripped; a lamp lit or dark; a display's pages), taken from the component's own state type or its view's inputs, with what drives each in the world.
- **Its placements:** every room it is placed in and how many copies, each copy with its tag, its asset id, its look link (125) and its row in that room's audit (129); counts in dev rooms and outside them, as 126 counts them. Rooms whose contents are not counted from data (until 127) are named as such.
- **A link to its magic room.**

## The magic room

A grey development room that exists for no other reason: generated for the one item, on demand, from a URL (settle its form in the plan, for example `?room=magic&item=<kind>`), and not part of the building, its plan or the save.

- **Sized to the item:** the room is built round the item's bounds, with room to walk all the way round it (at least the walker's clearance on every side, more for a large item), and tall enough to stand under or look down on it. A very large item (a boiler, an air handling unit) gets a large room; the smallest still gets a room you can walk round in.
- **Placed to walk round:** the item stands free in the middle, on the floor if it is floor-standing, on a short stub of wall if it is wall-mounted, or hanging if it hangs, facing the door the player enters by; the room's walk collision keeps the player off it.
- **Plain:** grey walls, floor and ceiling, even lighting, the item's name on a title card, a dev room number-free caption saying it is a magic room for that item.
- **The magic control panel:** if the item has states, a signpost beside it carries a small Penfold panel with a knob selector, one position per main state (and a page knob where it has display pages). Turning it sets the item's view to that state, so you can see how it looks. It is a look, not a simulation: the item is not bound to the world, and nothing it does reaches the world or the save. All input goes through the one control scheme, as every knob's does.
- **Back:** a way out to the item audit page and to the catalogue.

The magic room is built by the same view builders the real rooms use, so what it shows is what the game shows; an item whose builder needs a world binding is given a stand-in reading for its chosen state.

## Deprecated objects

The audit can mark a kind deprecated (a short list in data, with the reason and its replacement), and 126's Game objects category can filter to deprecated kinds still placed outside dev rooms, which is the list of things to replace.

## Acceptance

- The item audit of the weather station console (CR-CP10's kind) lists its parts, its states and pages, its placements in dev0 and the control room with look links, and opens its magic room, where the panel's knob steps it through its pages.
- A valve's audit lists all its placements across the building, grouped by room.
- A large item (a boiler) and a small one (a gauge) both get a magic room you can walk round.
- The generator (sizing and placement) is pure, in `logic/`, with tests beside it.

## Records

The plan in `doc/plans/130-item-audit.md`; `TODO.md`; `CHANGELOG.md` under Unreleased once built; a diary entry.
