import { drawPaneOrb } from '../../core/views/boot-screens';

/** The front of the Trio's Fenestra Prospect Embedded service box, at 400 × 520. */
export function drawFenestraBoxFront(ctx: CanvasRenderingContext2D): void {
  const ground = ctx.createLinearGradient(0, 0, 400, 520);
  ground.addColorStop(0, '#173c5c');
  ground.addColorStop(0.48, '#0a253e');
  ground.addColorStop(1, '#071526');
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, 400, 520);

  // A translucent, glass-like ribbon winds behind the operating system's orb.
  ctx.save();
  ctx.globalAlpha = 0.25;
  for (const [colour, lift] of [
    ['#54ddcf', -28],
    ['#b0e65c', 11],
    ['#e8a85b', 47],
    ['#a98fe9', 81],
  ] as const) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = 24;
    ctx.beginPath();
    ctx.moveTo(-40, 355 + lift);
    ctx.bezierCurveTo(80, 400 + lift, 210, 140 + lift, 445, 250 + lift);
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = '#e5f7f7';
  ctx.font = 'bold 18px Verdana, sans-serif';
  ctx.fillText('FENESTRA', 28, 55);
  ctx.font = '13px Verdana, sans-serif';
  ctx.fillText('by Mullion Software Corporation', 29, 76);
  ctx.strokeStyle = '#86d8d3';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(28, 90);
  ctx.lineTo(372, 90);
  ctx.stroke();

  ctx.fillStyle = '#f6fbfc';
  ctx.font = 'bold 49px Arial, sans-serif';
  ctx.fillText('Prospect', 26, 160, 350);
  ctx.font = 'bold 18px Verdana, sans-serif';
  ctx.fillText('EMBEDDED 6.0', 29, 190);
  drawPaneOrb(ctx, 202, 297, 79);

  ctx.fillStyle = '#d8f5f1';
  ctx.font = 'bold 15px Verdana, sans-serif';
  ctx.fillText('PROFESSIONAL EMBEDDED EDITION', 26, 432, 350);
  ctx.fillStyle = '#a8d8e0';
  ctx.font = '12px Verdana, sans-serif';
  ctx.fillText('Recovery and installation media', 27, 458);
  ctx.fillText('for dedicated control computers', 27, 476);
  ctx.fillStyle = '#5cd9cd';
  ctx.fillRect(0, 504, 400, 16);
}
