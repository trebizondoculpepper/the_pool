/** Logical LCD geometry shared by drawing and touch targeting. */
export const PHONE_LOGICAL_SIZE = 128;
export const PHONE_TEXTURE_SIZE = 512;
export const PHONE_PIXEL_SCALE = PHONE_TEXTURE_SIZE / PHONE_LOGICAL_SIZE;
export const PHONE_FOOTER_TOP = 113;
export const PHONE_LIST_TOP = 32;
export const PHONE_LIST_ROW_HEIGHT = 16;
export const PHONE_LIST_VISIBLE_ROWS = 5;
export const PHONE_MAIN_ROWS = [
  { x: 3, y: 32, w: 122, h: 18 },
  { x: 3, y: 52, w: 122, h: 18 },
  { x: 3, y: 72, w: 122, h: 18 },
  { x: 3, y: 92, w: 122, h: 18 },
] as const;

export function phoneListStart(selected: number, count: number) {
  return Math.max(0, Math.min(selected - 4, count - PHONE_LIST_VISIBLE_ROWS));
}
