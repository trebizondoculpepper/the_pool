import { offerFullscreen } from '../logic/fullscreen-offer';

/**
 * The game's Enter fullscreen control (mission 216): a button in the top
 * corner when the landing page's Play now asked for fullscreen, shown while
 * the page is windowed and hidden while it is fullscreen (the browser's own
 * Escape leaves it, and the button comes back). Closing it with its ×
 * leaves the game windowed, which works as well.
 */
export function installFullscreenButton(search = location.search) {
  const root = document.documentElement;
  const enabled = !!document.fullscreenEnabled && !!root.requestFullscreen;
  if (!offerFullscreen(search, enabled, !!document.fullscreenElement)) return;
  const bar = document.createElement('div');
  bar.className = 'fullscreen-offer';
  const go = document.createElement('button');
  go.type = 'button';
  go.textContent = 'Enter fullscreen';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'fullscreen-offer-close';
  close.textContent = '×';
  close.setAttribute('aria-label', 'Stay in the window');
  bar.append(go, close);
  // Its clicks are its own, never the game's (no pointer lock, no use).
  for (const type of ['pointerdown', 'mousedown', 'click', 'touchstart'])
    bar.addEventListener(type, (event) => event.stopPropagation());
  let dismissed = false;
  go.addEventListener('click', () => {
    root.requestFullscreen().catch(() => {
      go.textContent = 'Fullscreen unavailable';
      go.disabled = true;
    });
  });
  close.addEventListener('click', () => {
    dismissed = true;
    bar.remove();
  });
  document.addEventListener('fullscreenchange', () => {
    bar.hidden = dismissed || !!document.fullscreenElement;
  });
  document.body.append(bar);
}
