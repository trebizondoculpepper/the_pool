import type { DisplayState } from '../../../ui2d/boot';

/**
 * Which one page a bridge screen shows (mission 124; the owner,
 * 2026-11-02): every screen, the main viewscreen and each console's, shows
 * exactly one LCARS page at a time, chosen by its state. Unpowered or
 * switched off it shows the black page; booting, the World Federation of
 * Baths boot page (`BootScreen`'s emblem and draw-in); running, the page
 * selected for it. Nothing is layered over a page to hide it. Pure.
 */
export type ScreenPage = 'black' | 'boot' | 'selected';

export function screenPage(state: DisplayState): ScreenPage {
  switch (state) {
    case 'unpowered':
    case 'off':
      return 'black';
    case 'booting':
      return 'boot';
    case 'running':
      return 'selected';
  }
}

/**
 * Which of a console's pages is on its one surface, the only one in its
 * holder: the page chosen for it, or, where it has a page of its own (the
 * main viewscreen's browser and alarms), that one while nothing else is
 * chosen or while its alarms are up (they are shown instead of the chosen
 * page, never over it).
 *
 * Before mission 124 the viewscreen's own surface stayed in its holder
 * under a chosen page, showing a black BLANK page, the two coplanar but
 * for 20 mm: which one was seen rested on the depth test alone.
 */
export function mountedPage(screen: {
  /** Whether a page other than its own is chosen for it. */
  chosen: boolean;
  /** Whether it has a page of its own (the viewscreen's). */
  builtIn: boolean;
  /** Whether its own page must be shown instead (the viewscreen's alarms). */
  alarms: boolean;
}): 'chosen' | 'builtIn' | null {
  if (screen.builtIn && (!screen.chosen || screen.alarms)) return 'builtIn';
  return screen.chosen ? 'chosen' : null;
}
