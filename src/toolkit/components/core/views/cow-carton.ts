import { cowSpots } from '../logic/cow-spots';

/**
 * The Gateway 3000's carton, its mark (`brands.ts`, the `carton` mark): a
 * little cow-spotted box drawn in perspective, as on its cartons and badges.
 * Our own drawing (the owner, 2026-10-31), moved here from the period PC
 * (`site-dressing/views/period-pc.ts`) so the brand's badge, which any
 * category may carry, draws the same carton the PC does.
 */

/** Black Holstein blotches over `w × h` of a canvas at (x, y). */
export function paintCowSpots(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: number,
  count: number,
) {
  const side = Math.min(w, h);
  context.save();
  context.beginPath();
  context.rect(x, y, w, h);
  context.clip();
  context.fillStyle = '#141414';
  for (const spot of cowSpots(seed, count)) {
    const cx = x + spot.x * w;
    const cy = y + spot.y * h;
    // A little larger on a long panel.
    const r = spot.r * side * (w / side > 1.5 ? 1.2 : 1);
    const n = spot.lobes.length;
    // Wider than tall, as a coat's blotches are.
    const points = spot.lobes.map((k, i) => {
      const a = (i / n) * Math.PI * 2;
      return [cx + Math.cos(a) * r * k * 1.15, cy + Math.sin(a) * r * k * 0.85];
    });
    // A smooth closed outline through the lobes' midpoints.
    const mid = (i: number) => {
      const [ax, ay] = points[i % n];
      const [bx, by] = points[(i + 1) % n];
      return [(ax + bx) / 2, (ay + by) / 2];
    };
    context.beginPath();
    const [sx, sy] = mid(n - 1);
    context.moveTo(sx, sy);
    for (let i = 0; i < n; i++) {
      const [px, py] = points[i];
      const [mx, my] = mid(i);
      context.quadraticCurveTo(px, py, mx, my);
    }
    context.fill();
  }
  context.restore();
}

/**
 * The carton, its front face's top left at (x, y + 0.3 h), `h` pixels high
 * overall, outlined in `ink`. Returns its width, pixels.
 */
export function drawCowCarton(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
  ink = '#1d1d1d',
) {
  const s = h;
  // The carton: front, top and side faces, white with black spots.
  context.save();
  context.lineWidth = Math.max(1, s * 0.05);
  context.strokeStyle = ink;
  const fx = x;
  const fy = y + s * 0.3;
  const fw = s * 0.6;
  const fh = s * 0.66;
  const dx = s * 0.26;
  const dy = s * 0.24;
  const faces: [number, number][][] = [
    [
      [fx, fy],
      [fx + fw, fy],
      [fx + fw, fy + fh],
      [fx, fy + fh],
    ],
    [
      [fx, fy],
      [fx + dx, fy - dy],
      [fx + fw + dx, fy - dy],
      [fx + fw, fy],
    ],
    [
      [fx + fw, fy],
      [fx + fw + dx, fy - dy],
      [fx + fw + dx, fy + fh - dy],
      [fx + fw, fy + fh],
    ],
  ];
  for (const [i, face] of faces.entries()) {
    context.beginPath();
    for (const [j, [px, py]] of face.entries())
      if (j === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    context.closePath();
    context.fillStyle = i === 2 ? '#dedede' : '#ffffff';
    context.fill();
    context.save();
    context.clip();
    paintCowSpots(context, x, y - dy, fw + dx, fh + dy * 2, 7 + i, 9);
    context.restore();
    // The face's outline again, the spots' paths having replaced it.
    context.beginPath();
    for (const [j, [px, py]] of face.entries())
      if (j === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    context.closePath();
    context.stroke();
  }
  context.restore();
  return fw + dx;
}
