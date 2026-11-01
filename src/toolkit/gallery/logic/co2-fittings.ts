/**
 * The CO₂ system's plant-room fittings' sizes and connections (mission
 * 118), shared by their drawings and by the room's plumbing: each in its
 * own frame, metres, centred on its middle, facing +z, its back on its wall
 * at z = −d/2. Pure.
 */

/** The dosing valve controller's backboard and its depth off the wall. */
export const CO2_PANEL_SIZE = { w: 0.7, h: 0.9, d: 0.28 } as const;

/** Where its gas enters (top) and leaves (bottom): its copper's ends. */
export const CO2_PANEL_PORTS = {
  inlet: [-0.17, CO2_PANEL_SIZE.h / 2, -0.08],
  outlet: [-0.17, -CO2_PANEL_SIZE.h / 2, -0.08],
  /** Its detector's interlock cable into its control box's top. */
  interlock: [0.3, 0.36, -0.03],
} as const;

/** The wall port: the stub through the wall, its lever ball valve and gauge. */
/**
 * As deep as its panel, so its front is the panel's and one stands at both
 * at once: its pipe and valve 0.06 m off the wall, in line with the panel's
 * copper.
 */
export const CO2_WALL_PORT_SIZE = { w: 0.24, h: 0.26, d: 0.28 } as const;
/** Its middle's height: hung just over its panel, its valve within reach. */
export const CO2_WALL_PORT_Y = 2.0;

export const CO2_WALL_PORT_PORTS = {
  /** The building line, out of the wall behind it. */
  in: [0, 0.06, -CO2_WALL_PORT_SIZE.d / 2],
  /** Its feed, down out of its foot to its room's panel. */
  out: [0, -CO2_WALL_PORT_SIZE.h / 2, -CO2_WALL_PORT_SIZE.d / 2 + 0.06],
} as const;

/**
 * The CO₂ detector: its NDIR head 0.3 m off the floor (CO₂ is heavier than
 * air), its controller (display, A1 and A2 lamps, ACCEPT and RESET) at
 * 1.5 m above it, one assembly on one backplate.
 */
/** Its depth reserved as deep as the acid board beside it, so one stands at both. */
export const CO2_DETECTOR_SIZE = { w: 0.22, h: 1.5, d: 0.35 } as const;
/** Its middle's height over the floor: its foot at 0.25 m, its head's at 0.3. */
export const CO2_DETECTOR_Y = 1.0;
/** The head's and the controller's middles, in its frame. */
export const CO2_DETECTOR_PARTS = {
  head: 0.3 - CO2_DETECTOR_Y,
  controller: 1.5 - CO2_DETECTOR_Y,
} as const;

export const CO2_DETECTOR_PORTS = {
  /** Its interlock cable, up out of its top. */
  alarm: [0.07, CO2_DETECTOR_SIZE.h / 2, -CO2_DETECTOR_SIZE.d / 2 + 0.05],
} as const;

// ---- The loading bay (the line's way in) ------------------------------------------

/** The wall inlet: the sleeve, the emergency isolation valve and its sign. */
export const CO2_INLET_SIZE = { w: 0.34, h: 0.4, d: 0.2 } as const;
/** The master valve's panel, its solenoid valve on the line beside it. */
export const CO2_MASTER_SIZE = { w: 0.5, h: 0.42, d: 0.2 } as const;

/**
 * Where they stand along the bay's north wall (x), east to west as the line
 * runs, and the line's height: in from the yard at the inlet, through the
 * master valve, and into the wall west of it to the plant rooms.
 */
export const CO2_LOADING_BAY = {
  inlet: 5.9,
  master: 5.1,
  detector: 4.2,
  y: 1.5,
  /** The line's height through them. */
  line: 1.62,
  /** Its depth off the wall. */
  off: 0.06,
} as const;
