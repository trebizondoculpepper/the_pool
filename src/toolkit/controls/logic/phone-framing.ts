/**
 * Place the held phone in camera space while keeping its apparent size and
 * screen position steady as the player's field of view or zoom changes.
 * Values are in room metres relative to the camera; the view applies the
 * room's metre scale.
 */
export function phoneFraming(
  fov: number,
  zoom: number,
  cameraAspect: number,
  viewportAspect: number,
  lift: number,
) {
  // The room canvas can be letterboxed to 4:3 on a portrait phone, so its
  // camera aspect alone cannot tell us that the player has a narrow screen.
  const narrow = viewportAspect < 0.8;
  const depth = 0.7;
  const radians = ((fov > 0 ? fov : 68) * Math.PI) / 360;
  const halfHeight = (depth * Math.tan(radians)) / (zoom > 0 ? zoom : 1);
  const baseline = depth * Math.tan((68 * Math.PI) / 360);
  return {
    scale: (3.2 * halfHeight) / baseline,
    x: (narrow ? 0.37 : 0.36) * halfHeight * cameraAspect,
    y: (-1.7 + (narrow ? 1.34 : 1.24) * lift) * halfHeight,
    z: -depth,
  };
}
