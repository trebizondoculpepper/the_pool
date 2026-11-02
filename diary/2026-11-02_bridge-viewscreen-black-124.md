# Development Diary Entry - 2026-11-02

## Context

- **Date**: 2026-11-02 14:45 UTC
- **Branch**: main
- **Contributors**: Claude Code + the owner (mission 124)

## Problem Statement

OUTSIDE CONDITIONS and OLYMPIC FILTER WASHING were seen black on the bridge's main viewscreen though they drew on a console's screen. The owner asked for the cause and for every bridge screen to show exactly one page at a time, chosen by its state, with the draw-over BLANK system gone.

## Our Approach

Dumped the viewscreen's holder from the live scene (importing the page's own `three` module to catch the scene in `onBeforeRender`), set up save slots with the pages chosen and the alarms accepted, and paged the screen live with its strip. Then replaced the layering with one mounted page.

## Implementation

`src/toolkit/gallery/logic/bridge-screen-page.ts` (`screenPage`, `mountedPage`, tested), `bridge-console.ts` (`mount`: one page exhibit in a holder), `bridge-viewscreen.ts` (no BLANK page; its browser rests while another page is chosen). Finding in `doc/plans/124-bridge-viewscreen-black.md`.

## Outcomes

The holder held the viewscreen's own surface showing an all-black BLANK page 20 mm behind the chosen page, same render order and polygon offset, so what was seen rested on depth precision and draw order. On this machine's 24-bit depth both pages showed; the black could not be reproduced, but the layering was the only way an all-black screen could appear with a page whose canvas held its drawing. Accepting the bridge's alarms from the console proved awkward (the backquote key did not open it through the browser tool); editing a save slot from a same-origin non-game page (`/package.json`) was the reliable way to set world state before load.

## Next Steps

None for this mission. Benchmarked components are unchanged (the viewscreen now draws less).
