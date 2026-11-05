/**
 * Whether the game offers to go fullscreen (mission 216): only when the
 * landing page launched it asking for fullscreen (`?fullscreen=1`), the
 * browser can do it, and the page is not fullscreen already. A browser
 * leaves fullscreen when it navigates, so the landing page cannot carry it
 * into the game; the game asks instead, from the player's own click. Pure.
 */
export function offerFullscreen(
  search: string,
  enabled: boolean,
  active: boolean,
): boolean {
  return (
    new URLSearchParams(search).get('fullscreen') === '1' && enabled && !active
  );
}
