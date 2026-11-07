import type { PhoneAction, PhoneFrame } from './phone-menu';
import {
  PHONE_FOOTER_TOP,
  PHONE_LIST_ROW_HEIGHT,
  PHONE_LIST_TOP,
  PHONE_LIST_VISIBLE_ROWS,
  PHONE_LOGICAL_SIZE,
  PHONE_MAIN_ROWS,
  PHONE_PIXEL_SCALE,
  PHONE_TEXTURE_SIZE,
  phoneListStart,
} from './phone-layout';

export type PhoneTouch = { action: PhoneAction } | { index: number };
export { PHONE_TEXTURE_SIZE } from './phone-layout';

export function phoneKeyAction(code: string): PhoneAction | null {
  if (code === 'ArrowUp') return 'up';
  if (code === 'ArrowDown') return 'down';
  if (code === 'ArrowLeft') return 'left';
  if (code === 'ArrowRight') return 'right';
  if (code === 'Enter') return 'select';
  return null;
}

/** Resolve a texture pixel against the same 128-square layout the LCD draws. */
export function phoneDisplayTouch(
  frame: PhoneFrame,
  x: number,
  y: number,
): PhoneTouch | null {
  if (x < 0 || x >= PHONE_TEXTURE_SIZE || y < 0 || y >= PHONE_TEXTURE_SIZE)
    return null;
  const logicalX = x / PHONE_PIXEL_SCALE;
  const logicalY = y / PHONE_PIXEL_SCALE;
  if (logicalY >= PHONE_FOOTER_TOP)
    return frame.page === 'message' || frame.page === 'placeholder'
      ? null
      : { action: 'select' };
  if (frame.page === 'main') {
    const index = PHONE_MAIN_ROWS.findIndex(
      ({ x: left, y: top, w, h }) =>
        logicalX >= left &&
        logicalX < left + w &&
        logicalY >= top &&
        logicalY < top + h,
    );
    return index >= 0 ? { index } : null;
  }
  if (
    (frame.page === 'messages' || frame.page === 'inbox') &&
    logicalY >= PHONE_LIST_TOP &&
    logicalY < PHONE_LIST_TOP + PHONE_LIST_ROW_HEIGHT * PHONE_LIST_VISIBLE_ROWS
  ) {
    const start = phoneListStart(frame.selected, frame.rows.length);
    const index =
      start + Math.floor((logicalY - PHONE_LIST_TOP) / PHONE_LIST_ROW_HEIGHT);
    return index < frame.rows.length ? { index } : null;
  }
  if (
    frame.page === 'message' &&
    logicalY >= PHONE_LIST_TOP &&
    logicalY < PHONE_FOOTER_TOP
  )
    return { action: logicalY < PHONE_LOGICAL_SIZE / 2 ? 'up' : 'down' };
  return null;
}

/** Model-local coordinates on the combined handset button mesh. */
export function phoneKeyTouch(x: number, y: number): PhoneTouch | null {
  // The blue Navi key sits above the scroll pad; C and Power flank its middle.
  // Regions follow the measured centres of the supplied handset model. The
  // number pad below the scroll pad has no menu action.
  if (Math.abs(x) < 0.09 && y >= -0.105 && y <= 0.02)
    return { action: 'select' };
  if (x >= -0.33 && x <= -0.19 && y >= -0.27 && y <= -0.15)
    return { action: 'back' };
  if (Math.abs(x) < 0.075 && y >= -0.21 && y < -0.105) return { action: 'up' };
  if (x >= -0.18 && x < -0.055 && y >= -0.28 && y <= -0.18)
    return { action: 'left' };
  if (x > 0.055 && x <= 0.18 && y >= -0.28 && y <= -0.18)
    return { action: 'right' };
  if (Math.abs(x) < 0.075 && y >= -0.35 && y < -0.21) return { action: 'down' };
  return null;
}
