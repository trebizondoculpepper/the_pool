import type { PhoneAction, PhoneFrame } from './phone-menu';

export type PhoneTouch = { action: PhoneAction } | { index: number };

export function phoneKeyAction(code: string): PhoneAction | null {
  if (code === 'ArrowUp') return 'up';
  if (code === 'ArrowDown') return 'down';
  if (code === 'ArrowLeft') return 'left';
  if (code === 'ArrowRight') return 'right';
  if (code === 'Enter') return 'select';
  return null;
}

/** The live display is drawn in a 512-square texture. */
export function phoneDisplayTouch(
  frame: PhoneFrame,
  x: number,
  y: number,
): PhoneTouch | null {
  if (x < 0 || x >= 512 || y < 0 || y >= 512) return null;
  if (y >= 449) return { action: x < 256 ? 'back' : 'select' };
  if (frame.page === 'main' && y >= 125 && y < 428) {
    const col = x < 256 ? 0 : 1;
    const row = y < 278 ? 0 : 1;
    return { index: row * 2 + col };
  }
  if (
    (frame.page === 'messages' || frame.page === 'inbox') &&
    y >= 123 &&
    y < 439
  ) {
    const start = Math.max(
      0,
      Math.min(frame.selected - 3, frame.rows.length - 4),
    );
    const index = start + Math.floor((y - 123) / 79);
    return index < frame.rows.length ? { index } : null;
  }
  if (frame.page === 'message') return { action: y < 278 ? 'up' : 'down' };
  return null;
}

/** Model-local coordinates on the combined handset button mesh. */
export function phoneKeyTouch(x: number, y: number): PhoneTouch | null {
  if (y > -0.01 || y < -0.25 || Math.abs(x) > 0.33) return null;
  if (y > -0.085) {
    if (x < -0.13) return { action: 'back' };
    if (Math.abs(x) < 0.13) return { action: 'select' };
    return null;
  }
  if (x < -0.08) return { action: 'left' };
  if (x > 0.08) return { action: 'right' };
  return { action: y > -0.17 ? 'up' : 'down' };
}
