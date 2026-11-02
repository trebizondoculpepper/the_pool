# 124: The bridge's main viewscreen shows black

The owner, 2026-11-02: find out, explain and fix why the bridge's main viewscreen shows nothing but black for some pages. Investigation first: write down what is wrong before changing anything, and ask the owner before a fix that changes how displays are culled for the whole game. Read `CLAUDE.md` first.

## What was seen

Mission 123's agent (2026-11-02) put the new OUTSIDE CONDITIONS page (`outside-weather`, `src/toolkit/gallery/logic/bridge-pages.ts`) on the main viewscreen and saw black; the existing OLYMPIC FILTER WASHING page shows black there too, so it is not new. The same page drawn on a console's screen (the Boiler Helmsman's) shows correctly. The agent reported it as "any large touch-surface page".

## The lead, and where to look

The owner suspected a draw-distance limit on the viewscreens. A second-opinion review (Codex, 2026-11-02, checked against the code) makes that unlikely: the main viewscreen's texture is given the `lcars` display kind (`src/toolkit/gallery/views/bridge-viewscreen.ts:57`, and console-page textures at `src/toolkit/gallery/views/bridge-console.ts:241`), and `lcars` is an always-visible profile (`DISPLAY_PROFILES`, `src/toolkit/components/core/logic/display-reach.ts:175`), which `displayVisibility` (same file, line 233) shows in full before it checks distance, angle or readable size. Nothing on the bridge calls `setRoomDisplayLimits`, and `smallestReadable` governs signs, not these live pages. So reach is unlikely; do not change the reach rules unless the evidence points there.

The first suspect is overlapping touch surfaces. A selected page is added to the viewscreen's holder (`bridge-console.ts:308` and `:460`) while the built-in viewscreen surface stays there, and that surface deliberately shows its `BLANK` page when another page is selected (`bridge-viewscreen.ts:54`, `:97`). Both are touch surfaces drawn at the same local plane with the same render order (2) and polygon offset (`src/toolkit/components/industrial-control/views/touch-surface.ts:292`–`297`), so the black BLANK page may win the depth test over the selected page. This is a hypothesis, not an established cause.

The viewscreen's placement and size come from `viewscreenPlace()` (`src/toolkit/gallery/logic/control-room-prototype.ts:1381`), not `bridge-room.ts`. A touch surface's canvas is capped at 2048 pixels a side (`touch-surface.ts:272`); there is no `maxTextureSize` check on this path.

Investigate in this order:

1. Record the selected page's canvas contents (does it hold its drawing?), its texture's effective display kind, and the depth and render state of both surfaces in the holder (render order, polygon offset, position, which mesh wins the depth test).
2. Compare a failing custom page (OUTSIDE CONDITIONS, OLYMPIC FILTER WASHING) with a working schematic page, each seen near the wall and from the captain's chair.
3. Find why a console's screen shows the same page correctly: a different holder, mesh, size or layering.
4. Only then consider the 2048 px cap, the page failing to draw, or display reach.

## How the screens should work (the owner, 2026-11-02)

Today a screen is cleared by drawing a black page over it (the viewscreen's built-in surface showing `BLANK`, `bridge-viewscreen.ts:54` and `:97`, while a selected page is added beside it in the same holder). The owner wants that draw-over system gone. Instead, the black screen and the World Federation of Baths boot screen are ordinary LCARS pages of their own, and each screen shows exactly one page at a time, chosen by its state:

- **Unpowered or off:** the black page.
- **Booting:** the boot page (the existing boot screens, `ui2d`'s `BootScreen` and `bridge-lights-up.ts`'s boot as the power rises).
- **Running:** its normal page, the one selected for it.

Switching state switches the page on the one surface; nothing is layered over anything to hide it. This applies to the main viewscreen and to every bridge console screen. With one surface per screen there is nothing left to fight the selected page for the depth test, which is the first suspect for the black pages, so the redesign is expected to be the fix; the investigation confirms it (step 1 above) and the finding says so.

## What to deliver

1. A short written finding in `doc/plans/124-bridge-viewscreen-black.md`: the cause, with evidence (a screenshot standing near and one from the captain's chair, each sent separately, and what step 1 recorded).
2. The redesign above, removing the draw-over `BLANK` system, and a fix for the confirmed failure path if it is anything else, within the component benchmark's budget (`bench.html?bench=components`) and the displays-redraw-only-on-change rule. Keep the shared reach rules untouched unless the evidence implicates them; any change to them for all displays needs the owner's agreement first.
3. Tests in `logic/`: each screen's page follows its state (off, booting, running) and only one page is ever shown on a screen; and a test of the confirmed failure path, not a reach-profile test by default.

## Coordination

Missions 125 and 126 are done and do not block this. Mission 127 may touch the viewscreen's identity or look target, and 129 and 130 show it; none of them should duplicate display rendering, and a geometry or look audit passing does not prove the screen is readable. Coordinate edits to `bridge-console.ts` and the viewscreen builder with any agent working on bridge object identity.

## Open questions for the owner

None at brief stage; owner approval is already reserved for any game-wide culling change.

## Records

`TODO.md` (this mission), `CHANGELOG.md` under Unreleased `### Fixed` once fixed, a diary entry.
