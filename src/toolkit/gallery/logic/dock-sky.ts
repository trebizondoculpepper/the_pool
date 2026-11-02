/**
 * Whether the loading dock's sky and yard are cut away for an eye in one
 * of the chemical stores' side doorways, or beyond one (the owner,
 * 2026-10-26: the sky and the yard showed over the hypochlorite store
 * from its doorway). Pure: the eye in the dock's yard group's own frame
 * (metres, the dock's middle at the origin, its outside wall's outer face
 * at z = `wallZ`, negative, north), the dock `width` wide.
 *
 * Only the side walls count. An eye beyond the back wall is in the main
 * corridor, looking in through the dock's doors, and sees the sky and the
 * yard through the lorry openings as from inside (the owner, 2026-11-02:
 * the sky did not draw until the walker crossed the threshold).
 */
export function inSideDoorway(
  eye: { x: number; z: number },
  { wallZ, width }: { wallZ: number; width: number },
): boolean {
  return eye.z > wallZ && Math.abs(eye.x) > width / 2 - 0.05;
}
