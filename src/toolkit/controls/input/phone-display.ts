import { CanvasTexture, SRGBColorSpace } from 'three';
import type { PhoneFrame } from '../logic/phone-menu';

const SIZE = 512;
const BLUE = '#174f90';
const DARK = '#143252';
const YELLOW = '#f3cc40';
const PAPER = '#e6ecdc';

/** One texture upload per visible menu change, never one per world frame. */
export function createPhoneDisplay() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  let drawn = '';

  const text = (value: string, x: number, y: number, maxWidth = 450) => {
    if (!ctx) return;
    let shown = value;
    while (shown.length && ctx.measureText(shown).width > maxWidth)
      shown = `${shown.slice(0, -2)}…`;
    ctx.fillText(shown, x, y);
  };
  const show = (frame: PhoneFrame) => {
    const key = JSON.stringify(frame);
    if (key === drawn) return;
    drawn = key;
    if (!ctx) return;
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = DARK;
    ctx.fillRect(0, 0, SIZE, 48);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 29px sans-serif';
    text('POOL PLANT', 18, 33);
    ctx.textAlign = 'right';
    text('▮▮▮', SIZE - 16, 33);
    ctx.textAlign = 'left';
    ctx.fillStyle = BLUE;
    ctx.fillRect(0, 48, SIZE, 61);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 43px sans-serif';
    text(frame.title, 22, 91);

    if (frame.page === 'main') {
      const icons = ['☎', '✉', '▶', '◉'];
      frame.rows.forEach((row, index) => {
        const x = 20 + (index % 2) * 244;
        const y = 125 + Math.floor(index / 2) * 158;
        ctx.fillStyle = index === frame.selected ? YELLOW : '#f5f6ea';
        ctx.fillRect(x, y, 228, 145);
        ctx.strokeStyle = index === frame.selected ? DARK : '#8fa4a8';
        ctx.lineWidth = index === frame.selected ? 5 : 2;
        ctx.strokeRect(x + 2, y + 2, 224, 141);
        ctx.fillStyle = DARK;
        ctx.textAlign = 'center';
        ctx.font = 'bold 75px sans-serif';
        ctx.fillText(icons[index], x + 114, y + 78);
        ctx.font = 'bold 36px sans-serif';
        ctx.fillText(row, x + 114, y + 120);
        if (row === 'Messages' && frame.unread) {
          ctx.fillStyle = '#bc2828';
          ctx.beginPath();
          ctx.arc(x + 199, y + 23, 19, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 22px sans-serif';
          ctx.fillText(String(frame.unread), x + 199, y + 31);
        }
      });
      ctx.textAlign = 'left';
    } else if (frame.page === 'message' || frame.page === 'placeholder') {
      ctx.fillStyle = DARK;
      ctx.font = '38px sans-serif';
      frame.body.forEach((line, index) => text(line, 25, 164 + index * 66));
      if (frame.page === 'message' && frame.scroll)
        text('▲', SIZE - 55, 452, 30);
    } else {
      const start = Math.max(
        0,
        Math.min(frame.selected - 3, frame.rows.length - 4),
      );
      frame.rows.slice(start, start + 4).forEach((row, index) => {
        const y = 123 + index * 79;
        if (start + index === frame.selected) {
          ctx.fillStyle = BLUE;
          ctx.fillRect(14, y, SIZE - 28, 72);
          ctx.fillStyle = '#ffffff';
        } else ctx.fillStyle = DARK;
        ctx.font = 'bold 39px sans-serif';
        text(row, 27, y + 48, SIZE - 55);
      });
    }
    ctx.fillStyle = BLUE;
    ctx.fillRect(0, 449, SIZE, 63);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px sans-serif';
    text('Back', 20, 490, 100);
    ctx.textAlign = 'right';
    text(frame.page === 'message' ? 'Scroll' : 'Open', SIZE - 20, 490, 120);
    ctx.textAlign = 'left';
    texture.needsUpdate = true;
  };
  return { texture, show, dispose: () => texture.dispose() };
}
