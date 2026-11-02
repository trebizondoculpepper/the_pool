import { describe, expect, it } from 'vite-plus/test';
import {
  SETPOINTS,
  VIEWS,
  newWashOTron,
} from '../../../../game/plant/wash-o-tron';
import type { WashOTron } from '../../../../game/plant/wash-o-tron';
import { undrawable } from '../../industrial-control/logic/starburst-font';
import { washDisplay } from './wash-o-tron-display';

const inputs = { time: 3600, pitShare: 0.72 };
const view = (name: (typeof VIEWS)[number]) => VIEWS.indexOf(name);
const at = (s: Partial<WashOTron>) =>
  washDisplay({ ...newWashOTron(), ...s }, inputs);

describe('the Wash-O-Tron’s display', () => {
  it('writes a step’s times with a dash, not a colon (mission 143)', () => {
    expect(
      at({ washing: 1, step: 'backwash', stepTime: 150, running: true }),
    ).toEqual(['AUTO F2 BACKWASH    ', '02-30/05-00         ']);
  });

  it('shows the event log’s times of day with a dash', () => {
    expect(
      at({
        view: view('EVENTS'),
        events: ['07:05 F1 BACKWASH', '06:59 AUTO ON'],
      }),
    ).toEqual(['07-05 F1 BACKWASH   ', '06-59 AUTO ON       ']);
  });

  it('shows only what its 14-segment VFD can draw, in every view', () => {
    const states: Partial<WashOTron>[] = [
      {},
      { running: true, hold: true, washing: 0, step: 'settle', stepTime: 75 },
      { running: true, washing: 4, step: 'rinse', stepTime: Infinity },
      { washing: 2, step: null },
      { waiting: 'VALVES NOT PROVED' },
      { waiting: 'FILTER UNAVAILABLE' },
      { view: view('NEXT') },
      {
        view: view('NEXT'),
        filters: newWashOTron().filters.map((f) => ({ ...f, auto: false })),
      },
      { view: view('PIT') },
      ...SETPOINTS.map((_, k) => ({
        view: view('SETPOINTS'),
        setpoint: k,
        unlocked: 10,
        editing: k % 2 ? 120 : null,
      })),
      { view: view('EVENTS') },
      {
        view: view('EVENTS'),
        events: ['23:59 BACKWASH 120s', '00:00 F3 CYCLE LOW FLOW'],
      },
    ];
    for (const s of states)
      for (const line of at(s)) {
        expect(line).toHaveLength(20);
        expect(undrawable(line), line).toEqual([]);
      }
  });
});
