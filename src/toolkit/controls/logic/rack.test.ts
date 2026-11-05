import { describe, expect, it } from 'vite-plus/test';
import { rackRow } from './rack';
import type { RackSpec, RackItem } from './rack';

const RACK: RackSpec = {
  rowWidth: 0.4,
  rowDepth: 0.1,
  facing: '+z',
  gap: 0.006,
};
const box = (width: number, depth = 0.05, outward = '+x'): RackItem => ({
  width,
  depth,
  outward,
});
// A pretend yaw convention: +x outward to +z facing turns 90°.
const yawFor = (outward: string, facing: string) =>
  outward === '+x' && facing === '+z' ? 90 : 0;

describe('the rack row (mission 206)', () => {
  it('compacts a mixed-size row, centred, with the new item at a chosen end', () => {
    const left = rackRow(
      RACK,
      [box(0.05), box(0.06)],
      box(0.04),
      () => 0.4,
      yawFor,
    );
    const right = rackRow(
      RACK,
      [box(0.05), box(0.06)],
      box(0.04),
      () => 0.6,
      yawFor,
    );
    expect(left.ok && right.ok).toBe(true);
    if (!left.ok || !right.ok) return;
    expect(left.row).toHaveLength(3);
    expect(right.row).toHaveLength(3);
    // Both rows span the same width, centred on the rack's middle. Left row
    // = [0.04, 0.05, 0.06]; right row = [0.05, 0.06, 0.04]; two gaps.
    const total = 0.04 + 0.05 + 0.06 + 2 * RACK.gap;
    expect(left.row[0].x - 0.02).toBeCloseTo(-total / 2, 12);
    expect(left.row[2].x + 0.03).toBeCloseTo(total / 2, 12);
    expect(right.row[0].x - 0.025).toBeCloseTo(-total / 2, 12);
    expect(right.row[2].x + 0.02).toBeCloseTo(total / 2, 12);
  });

  it('never leaves a depth that overhangs the rack, or a row too wide', () => {
    expect(rackRow(RACK, [], box(0.04, 0.12), () => 0, yawFor).ok).toBe(false);
    const many = Array.from({ length: 12 }, () => box(0.05));
    expect(rackRow(RACK, many, box(0.05), () => 0, yawFor).ok).toBe(false);
  });

  it('keeps the existing items’ order, compacted, with the new one to the chosen end', () => {
    const r = rackRow(
      RACK,
      [box(0.05), box(0.06)],
      box(0.04),
      () => 0.4,
      yawFor,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // Random < 0.5 puts the new (0.04) item left of the old two.
    expect(r.row[0].x).toBeLessThan(r.row[1].x);
    expect(r.row[1].x).toBeLessThan(r.row[2].x);
  });

  it('turns each item’s outward face to the rack’s facing', () => {
    const r = rackRow(RACK, [], box(0.04), () => 0, yawFor);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.row[0].yaw).toBe(90);
  });
});
