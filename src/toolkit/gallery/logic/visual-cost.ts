import {
  BUSY_ROOMS,
  DEFAULT_BUDGET,
  knownOverBudget,
  overBudget,
  usageWeight,
} from './component-bench';
import type { BenchSample, Budget, Usage } from './component-bench';

/**
 * Visual cost (mission 135, plan `doc/plans/135-poly-versions-and-visual-cost.md`):
 * what an item's HIGH (its view builder's full version) and LOW (its far
 * version) cost to draw, as the component benchmark (mission 094) measures
 * it; its budget status; its weight in the game; and the record of its last
 * magic-room measurement, kept per viewer in the browser. Pure: the
 * measuring is `views/visual-cost.ts`, in the magic room.
 */

/** An item's two versions. */
export type PolyVariant = 'high' | 'low';
export const POLY_VARIANTS: readonly PolyVariant[] = ['high', 'low'];
export const VARIANT_LABEL: Record<PolyVariant, string> = {
  high: 'HIGH',
  low: 'LOW',
};

/** One version's figures, the benchmark's own (`BenchSample`'s fields). */
export interface VisualCost {
  drawCalls: number;
  triangles: number;
  materials: number;
  textures: number;
  /** Its textures' size on the GPU, bytes (RGBA8, mipmaps counted). */
  textureBytes: number;
  /** Whether it updates every frame (has an `update`). */
  live: boolean;
  /** Its `update`, µs a call: the median of six batches of twenty. */
  updateUs: number;
  /** Running: texture uploads and texels uploaded a second. */
  uploadsPerS: number;
  texelsPerS: number;
}

/** The benchmark's sample for one version, so its budgets judge it as they judge any component. */
export function asBenchSample(id: string, cost: VisualCost): BenchSample {
  const phase = (uploadsPerS: number, texelsPerS: number) => ({
    frames: 0,
    seconds: 0,
    updateMeanMs: 0,
    updateWorstMs: 0,
    renderMeanMs: 0,
    uploadsPerS,
    texelsPerS,
    ops2dPerS: 0,
  });
  return {
    id,
    label: id,
    source: 'room',
    buildMs: 0,
    updateUs: cost.updateUs,
    // The magic room has no world clock to stop: idle is not measured there.
    idle: phase(0, 0),
    active: phase(cost.uploadsPerS, cost.texelsPerS),
    drawCalls: cost.drawCalls,
    triangles: cost.triangles,
    materials: cost.materials,
    textures: cost.textures,
    textureBytes: cost.textureBytes,
    live: cost.live,
  };
}

export type BudgetState = 'within' | 'over' | 'known';
export interface BudgetStatus {
  state: BudgetState;
  /** What it does over its budget, in words. */
  over: string[];
  /** Why its overrun is known (`KNOWN_OVER_BUDGET`). */
  why?: string;
}

/**
 * Its budget status: within, over, or over but listed in
 * `KNOWN_OVER_BUDGET` with its reason. `ids` are the benchmark's ids it
 * may be listed under (a room item's key, `exhibit:<room>:<title>`).
 */
export function budgetStatus(
  cost: VisualCost,
  ids: readonly string[],
  budget: Budget = DEFAULT_BUDGET,
): BudgetStatus {
  const over = overBudget(asBenchSample(ids[0] ?? '', cost), budget);
  if (!over.length) return { state: 'within', over };
  for (const id of ids) {
    const why = knownOverBudget(id);
    if (why) return { state: 'known', over, why };
  }
  return { state: 'over', over };
}

export const BUDGET_WORDS: Record<BudgetState, string> = {
  within: 'within budget',
  over: 'over budget',
  known: 'over budget, known',
};

/** Rooms a kind's copies stand in (one entry a copy): its usage, as the benchmark counts it. */
export function usageOfRooms(rooms: readonly string[]): Usage {
  const usage: Usage = { count: 0, busy: 0, rooms: [] };
  for (const room of rooms) {
    usage.count += 1;
    if (BUSY_ROOMS.includes(room)) usage.busy += 1;
    if (!usage.rooms.includes(room)) usage.rooms.push(room);
  }
  return usage;
}

/** Its weight in the game: copies times cost, busy rooms counted double (`usageWeight`). */
export interface Weight {
  copies: number;
  weight: number;
  drawCalls: number;
  triangles: number;
  textureBytes: number;
}
export function weightOf(cost: VisualCost, usage: Usage): Weight {
  const weight = usageWeight(usage);
  return {
    copies: usage.count,
    weight,
    drawCalls: cost.drawCalls * weight,
    triangles: cost.triangles * weight,
    textureBytes: cost.textureBytes * weight,
  };
}

const kilo = (v: number) =>
  v >= 1e6
    ? `${(v / 1e6).toFixed(1)}M`
    : v >= 1e4
      ? `${(v / 1e3).toFixed(0)}k`
      : v >= 1e3
        ? `${(v / 1e3).toFixed(1)}k`
        : String(Math.round(v));
const mb = (bytes: number) => `${(bytes / 1e6).toFixed(2)} MB`;

/** One version's cost in a line: `412 draws · 18.3k tris · 24 mats · 6 tex 1.40 MB · live, update 12 µs`. */
export function costSummary(cost: VisualCost): string {
  return [
    `${cost.drawCalls} draws`,
    `${kilo(cost.triangles)} tris`,
    `${cost.materials} mats`,
    `${cost.textures} tex ${mb(cost.textureBytes)}`,
    cost.live
      ? `live, update ${cost.updateUs.toFixed(1)} µs, ${kilo(cost.texelsPerS)} texels/s`
      : 'static',
  ].join(' · ');
}

/** The few figures that fit the magic panel's readout, two short lines. */
export function costReadout(
  variant: PolyVariant,
  cost: VisualCost | undefined,
) {
  if (!cost) return [`${VARIANT_LABEL[variant]}: measuring…`, ''];
  return [
    `${VARIANT_LABEL[variant]} ${cost.drawCalls} DRAWS ${kilo(cost.triangles)} TRIS`,
    `${cost.materials} MATS ${cost.textures} TEX ${mb(cost.textureBytes)}${cost.live ? ` ${cost.updateUs.toFixed(0)}µs` : ''}`,
  ];
}

/** An item's last magic-room measurement, both versions. */
export interface CostRecord {
  kind: string;
  /** When it was measured, ms since the epoch. */
  measuredAt: number;
  /** The game's version and build it was measured under. */
  version: string;
  high: VisualCost;
  low: VisualCost;
}

/** Where a kind's record is kept in the viewer's browser. */
export const costStoreKey = (kind: string) => `pool.visual-cost.${kind}`;

const isCost = (v: unknown): v is VisualCost => {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    [
      'drawCalls',
      'triangles',
      'materials',
      'textures',
      'textureBytes',
      'updateUs',
      'uploadsPerS',
      'texelsPerS',
    ].every((k) => typeof o[k] === 'number') && typeof o.live === 'boolean'
  );
};

/** A stored record read back, or null if missing or malformed. */
export function parseRecord(
  text: string | null | undefined,
): CostRecord | null {
  if (!text) return null;
  try {
    const o = JSON.parse(text) as Partial<CostRecord>;
    if (
      typeof o.kind !== 'string' ||
      typeof o.measuredAt !== 'number' ||
      !isCost(o.high) ||
      !isCost(o.low)
    )
      return null;
    return {
      kind: o.kind,
      measuredAt: o.measuredAt,
      version: typeof o.version === 'string' ? o.version : '',
      high: o.high,
      low: o.low,
    };
  } catch {
    return null;
  }
}

/** The storage a record is kept in (the browser's `localStorage`, or a stand-in). */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** A kind's record from the store; null where there is none or the store refuses. */
export function loadRecord(
  store: KeyValueStore | undefined,
  kind: string,
): CostRecord | null {
  try {
    return parseRecord(store?.getItem(costStoreKey(kind)));
  } catch {
    return null;
  }
}

/** Keep a record; false where the store refuses (a private window). */
export function saveRecord(
  store: KeyValueStore | undefined,
  record: CostRecord,
): boolean {
  try {
    if (!store) return false;
    store.setItem(costStoreKey(record.kind), JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

/** How long ago a measurement was taken, in words: `just now`, `5 min ago`, `3 h ago`, `2 days ago`. */
export function recordAge(measuredAt: number, now: number): string {
  const s = Math.max(0, (now - measuredAt) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  const d = Math.floor(s / 86400);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

/** What the catalogue can sort its Game objects by. */
export type CostSort = 'name' | 'cost' | 'weight';

/**
 * Kinds ordered for the catalogue: by name, by their HIGH version's
 * triangles (cost), or by triangles times weight (weight). Kinds with no
 * measurement keep their order after those with one.
 */
export function sortByCost<T extends { key: string }>(
  kinds: readonly T[],
  sort: CostSort,
  costOf: (kind: T) => VisualCost | undefined,
  usageOf: (kind: T) => Usage,
): T[] {
  if (sort === 'name') return [...kinds];
  const score = (k: T) => {
    const c = costOf(k);
    if (!c) return -1;
    return sort === 'cost' ? c.triangles : weightOf(c, usageOf(k)).triangles;
  };
  return kinds
    .map((k, i) => ({ k, i, s: score(k) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.k);
}
