import { describe, expect, it } from 'vite-plus/test';
import { checkMimic } from '../../components/industrial-control/logic/mimic';
import { newWetHall } from '../../../game/plant/wet-hall';
import {
  dirtyWaterMimicSpec,
  dirtyWaterMimicState,
  freshWaterMimicSpec,
  freshWaterMimicState,
} from './wet-hall-water-mimics';

describe('wet hall destination and source mimics', () => {
  const reading = {
    wetHall: newWetHall(),
    mains: true,
    valves: { suction: true, discharge: true },
  };

  it('has a value for each lamp and readout on both boards', () => {
    expect(
      checkMimic(freshWaterMimicSpec, freshWaterMimicState(reading)),
    ).toEqual([]);
    expect(
      checkMimic(dirtyWaterMimicSpec, dirtyWaterMimicState(reading)),
    ).toEqual([]);
  });

  it('shows the Jacuzzi drain as pit-bound while the other branches can be still', () => {
    const wetHall = newWetHall();
    wetHall.branches.pool_03.dirty.actual = 3;
    wetHall.branches.pool_03.dirty.indicated = 2;
    wetHall.branches.pool_03.drain = 3;
    const shown = dirtyWaterMimicState({ ...reading, wetHall });
    expect(shown.lamps['pool_03-drain']).toBe(true);
    expect(shown.readouts.pool_03.flow.value).toBe(2);
    expect(shown.readouts.pool_02.flow.value).toBe(0);
  });
});
