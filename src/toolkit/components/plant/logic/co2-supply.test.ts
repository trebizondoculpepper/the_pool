import { describe, expect, it } from 'vite-plus/test';
import {
  CO2_CYLINDER,
  CO2_MANIFOLD,
  bankContents,
  bankFlag,
  bankInUse,
  bankPressure,
  co2SupplyAlarms,
  co2Pressures,
  cylinderPressure,
  drawCo2,
  newCo2Supply,
  rackToSwap,
  setIsolation,
  supplyFromCylinders,
  swapRack,
  swapRefusal,
  throwLever,
  vapourPressure,
} from './co2-supply';

describe('a CO₂ cylinder', () => {
  it('stands at its vapour pressure while it holds liquid: about 56 bar gauge at 20 °C', () => {
    expect(vapourPressure(20)).toBeCloseTo(56.3, 1);
    expect(cylinderPressure(34, 20)).toBeCloseTo(56.3, 1);
    expect(cylinderPressure(15, 20)).toBeCloseTo(56.3, 1);
  });
  it('falls only once the last liquid has gone, to nothing when empty', () => {
    expect(cylinderPressure(5, 20)).toBeLessThan(35);
    expect(cylinderPressure(1, 20)).toBeLessThan(6);
    expect(cylinderPressure(0, 20)).toBe(0);
  });
  it('reads lower on a cold day', () => {
    expect(cylinderPressure(34, 0)).toBeCloseTo(33.9, 1);
  });
});

describe('the changeover manifold', () => {
  it('starts with both banks full, the left in use and the right standing by', () => {
    const s = newCo2Supply(20);
    expect(bankContents(s, 'left')).toBe(4 * CO2_CYLINDER.contents);
    expect(bankInUse(s)).toBe('left');
    expect(bankFlag(s, 'left')).toBe('in-use');
    expect(bankFlag(s, 'right')).toBe('standby');
  });
  it('regulates down to the low-pressure line’s 4 bar, which the isolation valve shuts off', () => {
    const s = newCo2Supply(20);
    expect(co2Pressures(s)).toEqual({
      inlet: bankPressure(s, 'left'),
      outlet: CO2_MANIFOLD.outlet,
      line: CO2_MANIFOLD.outlet,
    });
    expect(co2Pressures(setIsolation(s, false)).line).toBe(0);
  });
  it('changes over to the reserve when the service bank is spent, its flag red', () => {
    const s = drawCo2(newCo2Supply(20), 4 * 34 - 2);
    expect(bankFlag(s, 'left')).toBe('empty');
    expect(bankInUse(s)).toBe('right');
    expect(bankFlag(s, 'right')).toBe('in-use');
    expect(co2Pressures(s).outlet).toBe(CO2_MANIFOLD.outlet);
    // Drawing on takes from the right.
    const on = drawCo2(s, 10);
    expect(bankContents(s, 'right') - bankContents(on, 'right')).toBeCloseTo(
      10,
      6,
    );
  });
  it('changes over by itself: the full rack becomes the one in service, the spent one awaits a swap', () => {
    const s = drawCo2(newCo2Supply(20), 4 * 34 - 2);
    expect(s.service).toBe('right');
    expect(rackToSwap(s)).toBe('left');
    // The swap refills the spent rack, not in service: it stands by.
    const swapped = swapRack(s);
    expect(bankContents(swapped, 'left')).toBe(4 * 34);
    expect(bankFlag(swapped, 'left')).toBe('standby');
    expect(bankInUse(swapped)).toBe('right');
    expect(co2SupplyAlarms(swapped).bankEmpty).toBe(false);
  });
  it('refuses a swap with nothing spent, and says why', () => {
    const s = newCo2Supply(20);
    expect(swapRack(s)).toBe(s);
    expect(swapRefusal(s)).toBe('neither rack is spent');
    // The lever thrown onto a spent rack: it must not be swapped while it feeds.
    const spent = throwLever(drawCo2(s, 4 * 34 - 2));
    expect(spent.service).toBe('left');
    expect(swapRefusal(spent)).toMatch(/still in service/);
  });
  it('with both racks spent, a swap refills the one not in service and the manifold takes it', () => {
    const s = drawCo2(newCo2Supply(20), 1000);
    expect(co2SupplyAlarms(s).exhausted).toBe(true);
    const swapped = swapRack(s);
    expect(co2SupplyAlarms(swapped).exhausted).toBe(false);
    expect(bankInUse(swapped)).toBe(swapped.service);
    expect(bankContents(swapped, swapped.service)).toBe(4 * 34);
  });
  it('takes an old save’s cylinders as two racks of grams', () => {
    const cyl = (kg: number, open = true) => ({ kg, open });
    const s = supplyFromCylinders({
      banks: {
        left: [cyl(1), cyl(1), cyl(1), cyl(1)],
        right: [cyl(34), cyl(34), cyl(34), cyl(34, false)],
      },
      service: 'left',
      isolation: true,
      ambient: 12,
    });
    expect(s.racks.right).toBe(3 * 34 * 1000);
    // Its left rack spent: the manifold has changed over.
    expect(s.service).toBe('right');
  });
  it('gives nothing once both banks are spent, and nothing through a shut valve', () => {
    const s = drawCo2(newCo2Supply(20), 1000);
    // What is left is gas at atmospheric pressure, which never comes out.
    expect(bankContents(s, 'left') + bankContents(s, 'right')).toBeLessThan(
      1.5,
    );
    expect(bankInUse(s)).toBeNull();
    expect(co2Pressures(s).line).toBe(0);
    const shut = setIsolation(newCo2Supply(20), false);
    expect(drawCo2(shut, 5)).toBe(shut);
  });
});

describe('the manifold’s alarms', () => {
  it('says nothing with both banks full', () => {
    expect(co2SupplyAlarms(newCo2Supply(20))).toEqual({
      bankEmpty: false,
      exhausted: false,
    });
  });
  it('calls BANK EMPTY, CHANGE CYLINDERS once it has changed over, and EXHAUSTED once both are spent', () => {
    const changed = drawCo2(newCo2Supply(20), 4 * 34 - 2);
    expect(co2SupplyAlarms(changed)).toEqual({
      bankEmpty: true,
      exhausted: false,
    });
    expect(co2SupplyAlarms(drawCo2(changed, 1000))).toEqual({
      bankEmpty: true,
      exhausted: true,
    });
  });
});
