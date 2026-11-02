# 124: The bridge's main viewscreen shows black: finding

Mission brief: `doc/prompts/124-bridge-viewscreen-black.md`. Investigated and fixed 2026-11-02.

## What step 1 recorded

On the shared dev server (MacBook Pro, Chrome, WebGL 2, 24-bit depth), the main viewscreen's holder (`createBridgeConsole`, `src/toolkit/gallery/views/bridge-console.ts`) was dumped from the live scene with OUTSIDE CONDITIONS chosen for it, both chosen at load and paged to live with the strip's ◄:

- The holder held three things: the viewscreen's own touch surface (`Main viewscreen`, its frame body at z = −20 mm and its screen at z = 0, render order 2, polygon offset −1/−4, canvas 2048 × 714), the pager strip (z = 25 mm), and the chosen page's own touch surface (`OUTSIDE CONDITIONS touch panel`, its group at z = 20 mm, its screen at the group's z = 0, render order 2, polygon offset −1/−4, canvas 2048 × 714).
- The viewscreen's own canvas was entirely black (0 of 15 074 samples lit): it was showing its `BLANK` page, as designed, because another page was chosen. The chosen page's canvas held its drawing (3 526 of 15 074 samples lit).
- Both textures were of the `lcars` display kind, always shown in full (`display-reach.ts`), so reach played no part. The holder and everything in it are scaled by 9.01 in the scene, so the 20 mm between the two screens is 0.18 scene units; the camera's near plane is 0.45 units and its far 721.

So the black page and the chosen page were two coplanar-but-for-20 mm surfaces at the same render order and the same polygon offset, and which one is seen rests on the depth test alone. With 24 bits of depth the gap is resolved anywhere on the bridge (at the captain's chair, about 88 units away, one depth step is about 0.001 units), and on this machine both failing pages showed correctly near the wall and from the chair, at load and after paging. With 16 bits (some mobile GPUs, software renderers) one step at the chair is about 0.26 units, more than the gap, and the black page wins wherever the depth test cannot tell them apart. Moving the chosen page to the black page's exact plane in the live scene left it showing only because it was drawn later (`LessEqual`), an order nothing guaranteed.

## The cause

The draw-over `BLANK` system: a chosen page was shown by layering it 20 mm in front of the viewscreen's own surface, which was kept in the holder showing a black page to hide its browser. Whether the viewer saw the page or the black depended on depth precision and draw order, not on anything the game decided. The black page is the only source of an all-black viewscreen with a page chosen: the page's own canvas always held its drawing. Not reproduced as black on this machine; the failure path is the layering itself. Display reach, the 2048 px canvas cap (both pages are 2048 × 714) and the page failing to draw were ruled out.

A console's screen showed the same page correctly because a console has no surface of its own: its holder holds only the chosen page and its strip.

## The fix (the owner's design, 2026-11-02)

Every bridge screen shows exactly one page at a time, chosen by its state: unpowered or off, the black page; booting, the World Federation of Baths boot page (`BootScreen`'s emblem and draw-in, as `bridge-lights-up.ts` powers the room's displays up); running, its selected page. `screenPage` and `mountedPage` (`src/toolkit/gallery/logic/bridge-screen-page.ts`) are the rules; `createBridgeConsole` keeps exactly one page exhibit in the holder (`mount`), swapping the viewscreen's own surface out for a chosen page and back again for its alarms, instead of layering one over the other. The `BLANK` page and the `blank` option are gone; while another page is chosen the viewscreen's browser is not updated, so it draws nothing (displays redraw only on change, and now less).

Screenshots (2026-11-02, the shared dev server, from the captain's chair): OUTSIDE CONDITIONS and OLYMPIC FILTER WASHING on the main viewscreen, the screens booting, and the screens off.
