import { CanvasTexture, NearestFilter, SRGBColorSpace } from 'three';
import type { PhoneFrame } from '../logic/phone-menu';
import { phoneGlyph } from '../logic/phone-font';
import { quantiseRgb444 } from '../logic/phone-colour';

const LOGICAL = 128;
const TEXTURE = 512;
const PAPER = '#c7d3c7';
const BLUE = '#345a8a';
const INK = '#172e4b';
const LIGHT = '#e6e9d8';
const HIGHLIGHT = '#d8bb68';

function bitmapText(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  maxChars = 20,
  scale = 1,
) {
  const shown =
    value.length > maxChars ? value.slice(0, maxChars - 2) + '..' : value;
  for (const [index, char] of [...shown].entries()) {
    const rows = phoneGlyph(char);
    for (let row = 0; row < 7; row++)
      for (let column = 0; column < 5; column++)
        if (rows[row] & (1 << (4 - column)))
          ctx.fillRect(
            x + index * 6 * scale + column * scale,
            y + row * scale,
            scale,
            scale,
          );
  }
}

/** A 128-square colour STN-style picture, enlarged without filtering. */
export function createPhoneDisplay() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = TEXTURE;
  const logical = document.createElement('canvas');
  logical.width = logical.height = LOGICAL;
  const ctx = canvas.getContext('2d');
  const lcd = logical.getContext('2d', { willReadFrequently: true });
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  let drawn = '';

  const show = (frame: PhoneFrame) => {
    const key = JSON.stringify(frame);
    if (key === drawn) return;
    drawn = key;
    if (!ctx || !lcd) return;
    lcd.fillStyle = PAPER;
    lcd.fillRect(0, 0, LOGICAL, LOGICAL);

    lcd.fillStyle = INK;
    lcd.fillRect(0, 0, LOGICAL, 12);
    lcd.fillStyle = LIGHT;
    bitmapText(lcd, 'POOL PLANT', 4, 2, 18);
    for (let index = 0; index < 3; index++)
      lcd.fillRect(108 + index * 5, 8 - index * 2, 3, 3 + index * 2);

    lcd.fillStyle = BLUE;
    lcd.fillRect(0, 12, LOGICAL, 17);
    lcd.fillStyle = LIGHT;
    bitmapText(lcd, frame.title, 4, 17, 19);

    if (frame.page === 'main') {
      frame.rows.forEach((row, index) => {
        const x = index % 2 ? 65 : 3;
        const y = index < 2 ? 32 : 73;
        lcd.fillStyle = index === frame.selected ? HIGHLIGHT : LIGHT;
        lcd.fillRect(x, y, 60, 37);
        lcd.strokeStyle = index === frame.selected ? INK : BLUE;
        lcd.strokeRect(x + 0.5, y + 0.5, 59, 36);
        lcd.fillStyle = INK;
        bitmapText(lcd, row[0] ?? '?', x + 25, y + 5, 1, 2);
        bitmapText(lcd, row, x + 6, y + 27, 8);
        if (row === 'Messages' && frame.unread) {
          lcd.fillStyle = '#b33b36';
          lcd.fillRect(x + 51, y + 4, 5, 5);
        }
      });
    } else if (frame.page === 'message' || frame.page === 'placeholder') {
      lcd.fillStyle = INK;
      let line = 0;
      for (const original of frame.body) {
        for (let at = 0; at < original.length && line < 8; at += 19) {
          bitmapText(lcd, original.slice(at, at + 19), 5, 33 + line * 10, 19);
          line++;
        }
      }
      if (frame.page === 'message' && frame.scroll)
        bitmapText(lcd, '▲', 118, 103, 1);
    } else {
      const start = Math.max(
        0,
        Math.min(frame.selected - 4, frame.rows.length - 5),
      );
      frame.rows.slice(start, start + 5).forEach((row, index) => {
        const y = 32 + index * 16;
        if (start + index === frame.selected) {
          lcd.fillStyle = BLUE;
          lcd.fillRect(3, y - 2, 122, 14);
          lcd.fillStyle = LIGHT;
        } else lcd.fillStyle = INK;
        bitmapText(lcd, row, 5, y + 1, 19);
      });
    }

    lcd.fillStyle = BLUE;
    lcd.fillRect(0, 113, LOGICAL, 15);
    const navi =
      frame.page === 'message' || frame.page === 'placeholder'
        ? ''
        : frame.page === 'main'
          ? 'SELECT'
          : 'OPEN';
    lcd.fillStyle = LIGHT;
    bitmapText(lcd, navi, (LOGICAL - navi.length * 6) / 2, 117, 12);

    const pixels = lcd.getImageData(0, 0, LOGICAL, LOGICAL);
    quantiseRgb444(pixels.data);
    lcd.putImageData(pixels, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(logical, 0, 0, TEXTURE, TEXTURE);
    ctx.fillStyle = 'rgba(20, 34, 50, 0.035)';
    for (let at = 0; at < TEXTURE; at += 4) {
      ctx.fillRect(at, 0, 1, TEXTURE);
      ctx.fillRect(0, at, TEXTURE, 1);
    }
    ctx.fillStyle = 'rgba(197, 218, 194, 0.045)';
    ctx.fillRect(0, 0, TEXTURE, TEXTURE);
    texture.needsUpdate = true;
  };
  return { texture, show, dispose: () => texture.dispose() };
}
