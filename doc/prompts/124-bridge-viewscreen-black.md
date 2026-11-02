# 124: The bridge's main viewscreen shows black

The owner, 2026-11-02: find out, explain and fix why the bridge's main viewscreen shows nothing but black for some pages. Investigation first: write down what is wrong before changing anything, and ask the owner before a fix that changes how displays are culled for the whole game. Read `CLAUDE.md` first.

## What was seen

Mission 123's agent (2026-11-02) put the new OUTSIDE CONDITIONS page (`outside-weather`, `src/toolkit/gallery/logic/bridge-pages.ts`) on the main viewscreen and saw black; the existing OLYMPIC FILTER WASHING page shows black there too, so it is not new. The same page drawn on a console's screen (the Boiler Helmsman's) shows correctly. The agent reported it as "any large touch-surface page".

## The owner's suspicion, and where to look

The owner suspects a draw-distance limit still applies to the viewscreens. The likely place is the display reach system, `src/toolkit/components/core/views/display-reach.ts` with its pure rules in `src/toolkit/components/core/logic/display-reach.ts`: every live canvas texture is watched, and when no camera is within its kind's reach of a mesh showing it, or none sees it front-on and large enough to read (`smallestReadable`, `withinRoomLimits`, `setRoomDisplayLimits`, `DISPLAY_PROFILES`), it is replaced by a flat canvas of its own average colour (`meanColour`). An LCARS page is mostly black, so a viewscreen judged out of reach would show as near-black, which would match what was seen. Check, at least:

- which display kind the viewscreen's texture is given (`setDisplayKind`), and that kind's reach and readable-size limits against the viewscreen's real size and the distance it is seen from on the bridge (`src/toolkit/gallery/rooms/bridge-room.ts`);
- whether "large enough to read" judges by the canvas's resolution or text size in a way that fails for a big, high-resolution page shown on a big screen far away;
- whether the bridge sets room display limits, and whether the viewscreen should be exempt or have its own profile (it is meant to be read from across the room);
- why console screens show the same page: a different mesh, size, kind or distance;
- whether it is instead the page's own size (a large touch surface's canvas exceeding a texture limit, `maxTextureSize`, or failing to draw), or the page never being drawn on the viewscreen at all, by checking what the texture holds when the viewer stands close.

## What to deliver

1. A short written finding in `doc/plans/124-bridge-viewscreen-black.md`: the cause, with evidence (a screenshot standing near and one from the captain's chair, each sent separately, and the numbers the reach rules computed).
2. A fix, once the cause is known: likely a viewscreen display profile that keeps it shown at bridge distances, within the component benchmark's budget (`bench.html?bench=components`) and the displays-redraw-only-on-change rule. Any change to the shared reach rules for all displays needs the owner's agreement first.
3. A test in `logic/` that the viewscreen at its real size and distance counts as readable.

## Records

`TODO.md` (this mission), `CHANGELOG.md` under Unreleased `### Fixed` once fixed, a diary entry.
