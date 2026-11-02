import { DESCRIBED_ROOMS } from '../../../../game/descriptors/registry';
import { roomNet } from './graph';

/**
 * Coverage (mission 138, plan section 2b): what is described of each
 * room, so that a representation's absence in an uncovered room is
 * unknown, never false. Scene coverage is whether 127's scanner has been
 * run for the room this session (a node page's Scan button records it).
 * Pure, save the session's set of scanned rooms.
 */

export interface RoomCoverage {
  descriptors: 'described' | 'not described';
  scene: 'scanned' | 'not scanned';
  network: 'model' | 'no model network';
}

const scanned = new Set<string>();
export const markScanned = (room: string) => scanned.add(room);

export function roomCoverage(room: string): RoomCoverage {
  return {
    descriptors: room in DESCRIBED_ROOMS ? 'described' : 'not described',
    scene: scanned.has(room) ? 'scanned' : 'not scanned',
    network: roomNet(room) ? 'model' : 'no model network',
  };
}

/** Whether a room is fully covered: described, and its scene scanned. */
export const fullyCovered = (c: RoomCoverage) =>
  c.descriptors === 'described' && c.scene === 'scanned';
