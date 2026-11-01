import { describe, expect, it } from 'vite-plus/test';
import { checkMimic } from '../../components/industrial-control/logic/mimic';
import { advance, newWorld } from '../../../game/world';
import { AREAS } from '../../../game/plant/heat-consumers';
import {
  ENERGY_MIMIC,
  ENERGY_ROWS,
  energyMimicState,
  facilityHeat,
} from './energy-mimic';

describe('the energy mimic (mission 120)', () => {
  const running = advance(newWorld(), 600, 10);

  it('has a row for each pool and each area on the ring, every lamp and readout driven, all on the board', () => {
    expect(ENERGY_ROWS.map((r) => r.name)).toEqual([
      'LOUNGE',
      'OLYMPIC',
      'JACUZZI',
      'FOOTBATH',
      ...AREAS.map((a) => a.name),
    ]);
    expect(ENERGY_ROWS.map((r) => r.name)).toContain('DHW');
    expect(checkMimic(ENERGY_MIMIC, energyMimicState(running.lthw))).toEqual(
      [],
    );
  });

  it('shows each facility’s heat from the ring, its total the ring’s delivered', () => {
    const s = energyMimicState(running.lthw);
    const rows = facilityHeat(running.lthw);
    const olympic = rows.find((r) => r.id === 'pool_02')!;
    expect(s.readouts['pool_02-total'].heat.value).toBe(
      Math.round(olympic.total),
    );
    expect(s.readouts['pool_02-water'].heat.value).toBe(
      Math.round(olympic.water),
    );
    expect(s.readouts.total.heat.value).toBe(
      Math.round(running.lthw.delivered),
    );
    expect(s.readouts.flow.heat.value).toBeCloseTo(80, 0);
    expect(s.readouts.supply.heat.value).toBeGreaterThan(100);
    expect(s.lamps.firing).toBe(true);
    expect(s.lamps['pool_02-heat']).toBe(true);
    // The areas not built show nothing.
    expect(s.readouts['reception-total'].heat.value).toBe(0);
    expect(s.lamps['dhw-heat']).toBe(false);
    const shares = rows.reduce(
      (t, r) => t + s.readouts[`${r.id}-share`].heat.value,
      0,
    );
    expect(shares).toBeGreaterThanOrEqual(98);
    expect(shares).toBeLessThanOrEqual(102);
  });

  it('rounds every value to what its digits show, so its board redraws only when one changes', () => {
    const s = energyMimicState(running.lthw);
    for (const [id, modes] of Object.entries(s.readouts)) {
      const r = modes.heat;
      const scale = 10 ** (r.places ?? 0);
      expect(Math.round(r.value * scale) / scale, id).toBe(r.value);
    }
    expect(JSON.stringify(energyMimicState({ ...running.lthw }))).toBe(
      JSON.stringify(s),
    );
  });
});
