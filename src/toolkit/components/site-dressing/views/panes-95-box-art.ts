/** The four coloured panes over a blue 1995 sky, inside the usual box-front art area. */
export function drawPanes95CoverScene(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(22, 157, 356, 265);
  ctx.clip();

  const sky = ctx.createLinearGradient(22, 157, 378, 422);
  sky.addColorStop(0, '#071947');
  sky.addColorStop(0.56, '#2779b7');
  sky.addColorStop(1, '#8ccbea');
  ctx.fillStyle = sky;
  ctx.fillRect(22, 157, 356, 265);

  // Long, fine light trails suggest the mid-1990s launch packaging.
  ctx.strokeStyle = 'rgba(210,239,255,0.42)';
  for (let n = 0; n < 8; n += 1) {
    ctx.lineWidth = n % 3 === 0 ? 2.2 : 0.8;
    ctx.beginPath();
    ctx.moveTo(12, 315 + n * 16);
    ctx.bezierCurveTo(120, 250 + n * 4, 280, 260 - n * 5, 410, 178 + n * 11);
    ctx.stroke();
  }

  // A four-pane mark belongs to PANES without tracing a real OS logo.
  const panes = [
    { x: 112, y: 225, c: '#de583f' },
    { x: 204, y: 219, c: '#7dbd57' },
    { x: 111, y: 304, c: '#55aee0' },
    { x: 206, y: 302, c: '#efc95b' },
  ];
  ctx.shadowColor = 'rgba(6,18,42,0.55)';
  ctx.shadowBlur = 13;
  ctx.shadowOffsetY = 8;
  for (const pane of panes) {
    const shade = ctx.createLinearGradient(
      pane.x,
      pane.y,
      pane.x + 74,
      pane.y + 62,
    );
    shade.addColorStop(0, '#ffffffbb');
    shade.addColorStop(0.12, pane.c);
    shade.addColorStop(1, '#18375e');
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.moveTo(pane.x, pane.y + 9);
    ctx.lineTo(pane.x + 71, pane.y);
    ctx.lineTo(pane.x + 73, pane.y + 57);
    ctx.lineTo(pane.x + 2, pane.y + 65);
    ctx.closePath();
    ctx.fill();
  }
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = '#effaff';
  ctx.font = 'bold 12px Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('THE DESKTOP OPENS UP', 200, 390, 310);
  ctx.restore();
}
