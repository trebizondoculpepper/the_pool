import { describe, expect, it } from 'vite-plus/test';
import { DEFAULT_TARGETS } from './aqualis-types';
import type { AqualisSettings } from './aqualis-types';
import { newSampler, stepSampler } from './aqualis-sampler';
import { newController, stepController } from './aqualis-controller';
import { RIG_POOL, newRig, rigSample, setDeviceConnected } from './aqualis-rig';
import {
  newRigCo2,
  plugRigCo2,
  rigCo2Ports,
  setRigCo2Mode,
  setRigCo2Port,
  stepRigCo2,
} from './aqualis-co2-rig';
import type { RigCo2 } from './aqualis-co2-rig';

const SETTINGS: AqualisSettings = {
  dynamics: { volumeM3: RIG_POOL.volumeM3, flowM3h: RIG_POOL.flowM3h },
  targets: DEFAULT_TARGETS,
};

/** Dev58's loop: the Trio on the rig, its acid unplugged, its CO₂ the real panels. */
function run(hours: number, co2: RigCo2 = newRigCo2()) {
  let rig = setDeviceConnected(newRig('ph-high'), 'acid', false);
  let sampler = newSampler(rigSample(rig));
  let control = newController();
  let c2 = co2;
  let out = null as ReturnType<typeof stepController>['out'] | null;
  for (let t = 0; t < hours * 3600; t += 10) {
    const s = stepSampler(sampler, rigSample(rig), 10);
    sampler = s.state;
    const c = stepController(
      control,
      {
        readings: s.readings,
        sample: s.status,
        selector: 'auto',
        ports: rigCo2Ports(rig, c2),
        settings: SETTINGS,
        hand: { hypochlorite: 0, acid: 0, co2: 0 },
      },
      10,
    );
    control = c.state;
    out = c.out;
    const r = stepRigCo2(rig, c2, c.out.demands, 10);
    rig = r.rig;
    c2 = r.co2;
  }
  return { rig, co2: c2, out: out! };
}

describe('dev58’s CO₂: the plant rooms’ panels on the Aqualis rig', () => {
  it('brings a high pH down through the Lounge’s solenoid panel, the Trio showing CO₂ online', () => {
    const start = newRig('ph-high').water.ph;
    const { rig, co2, out } = run(6);
    expect(out.channels.co2.status).toEqual({ kind: 'online' });
    expect(co2.grams.plant_pool_01).toBeGreaterThan(100);
    expect(co2.grams.plant_pool_02).toBe(0);
    expect(rig.water.ph).toBeLessThan(start - 0.2);
    expect(rig.sources.co2).toBeCloseTo(co2.grams.plant_pool_01, 6);
    // The free panel, in REMOTE on a hanging cable, calls SIGNAL LOST.
    expect(co2.plant.dosers.plant_pool_02.fault).toBe('signal-lost');
  });

  it('doses through the Olympic’s mass flow panel when its cable is plugged in', () => {
    const { co2, out } = run(2, plugRigCo2(newRigCo2(), 'plant_pool_02'));
    expect(out.channels.co2.status).toEqual({ kind: 'online' });
    expect(co2.grams.plant_pool_02).toBeGreaterThan(50);
    expect(co2.grams.plant_pool_01).toBe(0);
  });

  it('shows the channel OFFLINE with its panel switched off, and no supply with its wall port shut', () => {
    const off = run(0.1, setRigCo2Mode(newRigCo2(), 'plant_pool_01', 'off'));
    expect(off.out.channels.co2.status).toMatchObject({ kind: 'offline' });
    const shut = run(0.2, setRigCo2Port(newRigCo2(), 'plant_pool_01', false));
    expect(shut.out.channels.co2.status).toMatchObject({
      kind: 'offline',
      fault: 'NO SUPPLY PRESSURE',
    });
    expect(shut.co2.grams.plant_pool_01).toBe(0);
  });
});
