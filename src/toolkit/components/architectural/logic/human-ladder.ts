import type { Footprint } from '../../../controls/logic/walk-collision';

export type HumanLadderKind = 'pool' | 'tank-access' | 'caged' | 'utility';
export type LadderPoint = readonly [number, number, number];

/** Positions in the ladder's own metre-sized frame; the view transforms them with the mesh. */
export interface HumanLadderLayout {
  kind: HumanLadderKind;
  bottom: number;
  top: number;
  rung: LadderPoint;
  bottomExit: LadderPoint;
  topExit: LadderPoint;
  /** Tight footprints of the two stiles, not a solid across the rung passage. */
  stiles: readonly Footprint[];
}

export function humanLadderLayout(
  kind: HumanLadderKind,
  height: number,
  options: {
    width?: number;
    standOff?: number;
    topExit?: LadderPoint;
    bottomExit?: LadderPoint;
  } = {},
): HumanLadderLayout {
  if (!(height > 0) || !Number.isFinite(height))
    throw new Error('A human ladder needs a positive, finite height.');
  const half = (options.width ?? (kind === 'pool' ? 0.5 : 0.45)) / 2;
  if (!(half >= 0.18))
    throw new Error('A human ladder must have usable rung width.');
  const off = options.standOff ?? (kind === 'pool' ? 0.16 : 0.18);
  const bottom = kind === 'pool' || kind === 'tank-access' ? -height : 0;
  const top = kind === 'pool' || kind === 'tank-access' ? 0 : height;
  // The climber's line: on a caged ladder, through the middle of its cage
  // (hoops 0.7 m deep from rungs 0.2 m out, `createCagedLadder`), not
  // against the rungs, where the eye would be too close; 0.4 m out, as
  // the owner judged it in the game (2026-11-04).
  const rung: LadderPoint =
    kind === 'pool'
      ? [off, 0, 0]
      : kind === 'caged'
        ? [0, 0, 0.4]
        : [0, 0, off];
  return {
    kind,
    bottom,
    top,
    rung,
    bottomExit:
      options.bottomExit ??
      (kind === 'pool' ? [0.42, bottom, 0] : [0, bottom, off + 0.44]),
    topExit:
      options.topExit ?? (kind === 'pool' ? [-0.46, top, 0] : [0, top, -0.48]),
    stiles: [-half, half].map((side) =>
      kind === 'pool'
        ? {
            minX: off - 0.04,
            maxX: off + 0.04,
            minZ: side - 0.04,
            maxZ: side + 0.04,
          }
        : {
            minX: side - 0.04,
            maxX: side + 0.04,
            minZ: off - 0.04,
            maxZ: off + 0.04,
          },
    ),
  };
}
