import { describe, expect, it } from 'vite-plus/test';
import {
  CO2_DOSERS,
  newCo2Doser,
  setCo2Hand,
  setCo2On,
  setCo2Override,
  stepCo2Doser,
  trioSignal,
} from '../../../game/plant/co2-dosing';
import { MFC_PAGES, mfcKey, mfcLines, nextMfcPage } from './co2-mfc-display';

const GOOD = {
  ...trioSignal(0.25),
  inletBar: 4,
  waterFlowing: true,
  gasAlarm: false,
};
const olympic = () =>
  stepCo2Doser(newCo2Doser(CO2_DOSERS.plant_pool_02), GOOD, 60).state;

describe('the mass flow controller’s 2 × 16 LCD', () => {
  it('shows its flow and status on line 1, every page sixteen characters', () => {
    const d = olympic();
    for (const page of MFC_PAGES) {
      const [l1, l2] = mfcLines(d, 4, page);
      expect(l1).toHaveLength(16);
      expect(l2).toHaveLength(16);
      expect(l1).toBe('  500.0 g/h AUTO');
    }
    expect(mfcLines(d, 4, 'setpoint')[1]).toBe('SP AUTO  500 g/h');
    expect(mfcLines(d, 4, 'drive')[1]).toBe('VALVE DRIVE  15%');
    expect(mfcLines(d, 3.9, 'inlet')[1]).toBe('INLET  3.90 bar ');
    expect(mfcLines(d, 4, 'total')[1]).toBe('TOTAL   0.008 kg');
    expect(mfcLines(d, 4, 'alarm')[1]).toBe('ALM NONE        ');
    expect(mfcLines(d, 4, 'control')[1]).toBe('AUTO OVR NORMAL ');
  });

  it('shows an override on line 1, and HAND and OFF', () => {
    expect(mfcLines(setCo2Override(olympic(), 'open'), 4, 'control')).toEqual([
      '  500.0 g/h OPEN',
      'AUTO OVR OPEN   ',
    ]);
    expect(mfcLines(setCo2Override(olympic(), 'close'), 4, 'drive')[0]).toMatch(
      /SHUT$/,
    );
    expect(mfcLines(setCo2Hand(olympic(), true), 4, 'drive')[0]).toMatch(
      /HAND$/,
    );
    expect(mfcLines(setCo2On(olympic(), false), 4, 'drive')[0]).toMatch(
      / OFF$/,
    );
  });

  it('steps its pages with MODE, round again', () => {
    let page = MFC_PAGES[0];
    for (let k = 0; k < MFC_PAGES.length; k++) page = nextMfcPage(page);
    expect(page).toBe(MFC_PAGES[0]);
  });

  it('is blank with no power, and its key changes only with its text', () => {
    const d = olympic();
    const off = { ...d, powered: false };
    expect(mfcLines(off, 4, 'setpoint').join('').trim()).toBe('');
    expect(mfcKey(mfcLines(d, 4, 'drive'))).toBe(
      mfcKey(mfcLines({ ...d }, 4.001, 'drive')),
    );
  });
});
