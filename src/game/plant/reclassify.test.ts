import { describe, expect, it } from 'vite-plus/test';
import { EQUIPMENT_KINDS, resolveKindAffordances } from './equipment-kinds';

/**
 * The reclassification (mission 19, issue #19), first batch of 20 kinds (the
 * registry's first twenty in `kinds/index.ts` order): each kind's honest
 * interaction class, judged against the settled model — `readable` is
 * constant content; `inspectable` is a state-driven read-out; `interactive`
 * reacts to a use; `functional` is a world role with no status readout and
 * no use target; `decorative` is truly inert. Locked in by this test, so a
 * later audit `set` that changes a class is seen.
 */

const FIRST_TWENTY = [
  'acid-ibc',
  'acid-pump',
  'ahu-stack',
  'alarm-printer',
  'annunciator',
  'backwash-tank',
  'balance-tank',
  'balance-tank-panel',
  'bms-outstation',
  'boiler',
  'boiler-cascade',
  'booster-set',
  'break-tank',
  'butterfly-valve',
  'cabinet-switch',
  'calorifier',
  'carton',
  'cartridge-filter',
  'cascade-manager',
  'cctv',
] as const;

/** The first batch's honest classes (issue #19, PR #37). */
const EXPECTED: Record<(typeof FIRST_TWENTY)[number], string> = {
  // A chemical container's level is a live read-out.
  'acid-ibc': 'inspectable',
  // machine-like → operable → interactive.
  'acid-pump': 'interactive',
  // duct-air-like → operable → interactive.
  'ahu-stack': 'interactive',
  // Prints alarm records: a state-driven read-out, not constant text.
  'alarm-printer': 'inspectable',
  // Indicates live plant alarms (board-like's readable is superseded).
  annunciator: 'inspectable',
  // A tank's level is a live read-out.
  'backwash-tank': 'inspectable',
  'balance-tank': 'inspectable',
  // control-panel-like → operable → interactive.
  'balance-tank-panel': 'interactive',
  // Collects plant signals: a state-driven display.
  'bms-outstation': 'inspectable',
  // heat-like → operable → interactive.
  boiler: 'interactive',
  'boiler-cascade': 'interactive',
  // machine-like → operable → interactive.
  'booster-set': 'interactive',
  'break-tank': 'inspectable',
  // valve-like → operable → interactive.
  'butterfly-valve': 'interactive',
  // control-panel-like → operable → interactive.
  'cabinet-switch': 'interactive',
  // Stores hot water: a level read-out.
  calorifier: 'inspectable',
  // A bin: things are thrown in it — a world role, not inert.
  carton: 'functional',
  // filter-like → a filter state read-out.
  'cartridge-filter': 'inspectable',
  // control-panel-like → operable → interactive.
  'cascade-manager': 'interactive',
  // Displays camera views: a state-driven picture.
  cctv: 'inspectable',
};

describe('the reclassification, first twenty kinds (issue 19)', () => {
  it('each of the first twenty resolves its honest class', () => {
    for (const id of FIRST_TWENTY) {
      const kind = EQUIPMENT_KINDS[id];
      expect(kind, id).toBeTruthy();
      expect(resolveKindAffordances(kind).interaction, id).toBe(EXPECTED[id]);
    }
  });

  it('no kind of the first twenty is left unclassified', () => {
    for (const id of FIRST_TWENTY)
      expect(
        resolveKindAffordances(EQUIPMENT_KINDS[id]).interaction,
        id,
      ).not.toBe('unclassified');
  });
});
