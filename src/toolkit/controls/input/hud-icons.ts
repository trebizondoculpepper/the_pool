/**
 * The HUD's icons (the owner, 2026-11-01), drawn as filled shapes in the
 * current colour so they read at a glance at a small size: the view-link
 * pin as a modern map application's fat pin (in noclip too), the
 * screenshot as a stylised camera, the settings gear and the torch. Each
 * is SVG markup for an element's `innerHTML`; `size` sets its width and
 * height in CSS pixels.
 */

const svg = (size: number, body: string) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" fill="currentColor">${body}</svg>`;

/** A map application's pin: a fat teardrop with a round hole. */
export const pinIcon = (size = 26) =>
  svg(
    size,
    '<path fill-rule="evenodd" d="M12 1.5c-4.4 0-8 3.5-8 7.9 0 5.9 6.7 12.1 7.3 12.7.4.4 1 .4 1.4 0 .6-.6 7.3-6.8 7.3-12.7 0-4.4-3.6-7.9-8-7.9zm0 4.8a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4z"/>',
  );

/** A stylised stills camera: its body, the hump over the lens, the lens and a flash. */
export const cameraIcon = (size = 26) =>
  svg(
    size,
    '<path fill-rule="evenodd" d="M8.6 4.5h6.8l1.6 2.3h3a2 2 0 0 1 2 2v9.7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.8a2 2 0 0 1 2-2h3zM12 9a4.4 4.4 0 1 0 0 8.8A4.4 4.4 0 0 0 12 9zm0 2.2a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4z"/><rect x="17.6" y="8.6" width="2.2" height="1.4" rx=".5" fill-opacity=".55"/>',
  );

/** A gear: eight square-cut teeth round a hub with a hole. */
export const gearIcon = (size = 26) => {
  const teeth = Array.from({ length: 8 }, (_, i) => {
    const a = (i * 45 * Math.PI) / 180;
    const x = 12 + Math.sin(a) * 8.6;
    const y = 12 - Math.cos(a) * 8.6;
    return `<rect x="${(x - 1.9).toFixed(2)}" y="${(y - 2).toFixed(2)}" width="3.8" height="4" rx=".7" transform="rotate(${i * 45} ${x.toFixed(2)} ${y.toFixed(2)})"/>`;
  }).join('');
  return svg(
    size,
    `${teeth}<path fill-rule="evenodd" d="M12 4.6a7.4 7.4 0 1 1 0 14.8 7.4 7.4 0 0 1 0-14.8zm0 4.3a3.1 3.1 0 1 0 0 6.2 3.1 3.1 0 0 0 0-6.2z"/>`,
  );
};

/**
 * A torch, lying, its beam spreading to the right: the beam's three rays
 * carry the class `hud-torch-beam`, so the HUD can light them when it is on.
 */
export const torchIcon = (size = 26) =>
  svg(
    size,
    '<rect x=".8" y="9" width="10.4" height="6" rx="1.4"/><path d="M11.2 8.2h1.6L16 5.6v12.8l-3.2-2.6h-1.6z"/><rect x="4" y="7.4" width="3.4" height="2" rx=".6"/><path class="hud-torch-beam" d="M17.8 7 23 3.6M18.4 12h4.8M17.8 17l5.2 3.4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  );
