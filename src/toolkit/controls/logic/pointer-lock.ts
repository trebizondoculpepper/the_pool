/**
 * Browsers refuse a new pointer lock for a moment after Esc releases one
 * (Chrome for about a second). A refusal then says nothing about whether
 * the page may capture the mouse at all, so the next click should try
 * again; only a refusal well clear of a release means capture is not
 * allowed here, and looking falls back to dragging.
 */
export const RELOCK_COOLDOWN_MS = 2000;

/** Whether a lock refused `sinceRelease` ms after the last release means capture is unavailable. */
export function lockUnavailable(sinceRelease: number) {
  return sinceRelease > RELOCK_COOLDOWN_MS;
}

/**
 * How long after asking for the pointer, ms, a lock not granted counts as
 * refused: some browsers neither grant nor refuse it (Safari on an iPad
 * with a trackpad, the owner, 2026-11-01), and a click that only asks
 * again would leave the player unable to look at all.
 */
export const LOCK_SILENCE_MS = 700;
