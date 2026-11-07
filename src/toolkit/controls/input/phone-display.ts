import {
  CanvasTexture,
  LinearFilter,
  NearestFilter,
  SRGBColorSpace,
} from 'three';
import type { PhoneFrame } from '../logic/phone-menu';
import { phoneGlyph } from '../logic/phone-font';
import { quantiseRgb444 } from '../logic/phone-colour';
import {
  PHONE_FOOTER_TOP,
  PHONE_LIST_ROW_HEIGHT,
  PHONE_LIST_TOP,
  PHONE_LIST_VISIBLE_ROWS,
  PHONE_LOGICAL_SIZE as LOGICAL,
  PHONE_MAIN_ROWS,
  PHONE_TEXTURE_SIZE as TEXTURE,
  phoneListStart,
} from '../logic/phone-layout';

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

function menuIcon(
  ctx: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
) {
  ctx.fillStyle = INK;
  if (name === 'Phone') {
    ctx.fillRect(x + 2, y + 2, 4, 5);
    ctx.fillRect(x + 14, y + 2, 4, 5);
    ctx.fillRect(x + 4, y + 6, 3, 7);
    ctx.fillRect(x + 13, y + 6, 3, 7);
    ctx.fillRect(x + 6, y + 12, 8, 3);
  } else if (name === 'Messages') {
    ctx.fillRect(x + 1, y + 2, 18, 2);
    ctx.fillRect(x + 1, y + 4, 2, 11);
    ctx.fillRect(x + 17, y + 4, 2, 11);
    ctx.fillRect(x + 3, y + 15, 14, 2);
    for (let step = 0; step < 6; step++) {
      ctx.fillRect(x + 3 + step, y + 4 + step, 1, 1);
      ctx.fillRect(x + 16 - step, y + 4 + step, 1, 1);
    }
  } else if (name === 'Media') {
    for (let row = 0; row < 15; row++) {
      const width = 9 - Math.abs(row - 7);
      ctx.fillRect(x + 5, y + 1 + row, width, 1);
    }
  } else {
    ctx.fillRect(x + 2, y + 6, 17, 11);
    ctx.fillRect(x + 4, y + 8, 9, 2);
    ctx.fillRect(x + 4, y + 12, 9, 2);
    ctx.fillRect(x + 15, y + 10, 2, 2);
    for (let step = 0; step < 6; step++)
      ctx.fillRect(x + 2 + step, y + 6 - step, 1, 1);
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
  // The handset is magnified on desktop but minified inside a narrow canvas.
  // Linear minification keeps entire bitmap rows from vanishing in portrait.
  texture.minFilter = LinearFilter;
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
        const { x, y, w, h } = PHONE_MAIN_ROWS[index];
        lcd.fillStyle = index === frame.selected ? HIGHLIGHT : LIGHT;
        lcd.fillRect(x, y, w, h);
        lcd.strokeStyle = index === frame.selected ? INK : BLUE;
        lcd.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        lcd.fillStyle = INK;
        menuIcon(lcd, row, x + 5, y + 1);
        bitmapText(lcd, row, x + 30, y + 6, 14);
        if (row === 'Messages' && frame.unread) {
          lcd.fillStyle = '#b33b36';
          lcd.fillRect(x + w - 10, y + 6, 5, 5);
        }
      });
    } else if (frame.page === 'message' || frame.page === 'placeholder') {
      lcd.fillStyle = INK;
      frame.body
        .slice(0, 8)
        .forEach((line, index) =>
          bitmapText(lcd, line, 5, 33 + index * 10, 19),
        );
      if (frame.page === 'message') {
        if (frame.canScrollUp) bitmapText(lcd, '▲', 121, 33, 1);
        if (frame.canScrollDown) {
          lcd.fillRect(123, 108, 1, 1);
          lcd.fillRect(122, 109, 3, 1);
          lcd.fillRect(121, 110, 5, 1);
        }
      }
    } else {
      const start = phoneListStart(frame.selected, frame.rows.length);
      frame.rows
        .slice(start, start + PHONE_LIST_VISIBLE_ROWS)
        .forEach((row, index) => {
          const y = PHONE_LIST_TOP + index * PHONE_LIST_ROW_HEIGHT;
          if (start + index === frame.selected) {
            lcd.fillStyle = BLUE;
            lcd.fillRect(3, y - 2, 122, 14);
            lcd.fillStyle = LIGHT;
          } else lcd.fillStyle = INK;
          bitmapText(lcd, row, 5, y + 1, 19);
        });
    }

    lcd.fillStyle = BLUE;
    lcd.fillRect(0, PHONE_FOOTER_TOP, LOGICAL, LOGICAL - PHONE_FOOTER_TOP);
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
