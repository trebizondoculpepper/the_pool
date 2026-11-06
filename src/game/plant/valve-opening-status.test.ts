import { describe, expect, it } from 'vite-plus/test';
import { newWorld } from '../world';
import type { World } from '../world';
import { valveStateWords } from './component-descriptions';
import { describeForWorld, inspectionStatus } from './component-status';

describe('valveStateWords: one wording for every valve (#29, mission 150)', () => {
  it('says shut, open, or how far open', () => {
    expect(valveStateWords({ open: false, opening: 0 })).toBe('shut');
    expect(valveStateWords({ open: false, opening: 0.02 })).toBe('shut');
    expect(valveStateWords({ open: true, opening: 0.3 })).toBe(
      'part open, 30%',
    );
    expect(valveStateWords({ open: true, opening: 0.354 })).toBe(
      'part open, 35%',
    );
    expect(valveStateWords({ open: true, opening: 0.98 })).toBe('open');
    expect(valveStateWords({ open: true, opening: 1 })).toBe('open');
  });
  it('says which way a modulating valve is going while it strokes', () => {
    expect(valveStateWords({ open: true, opening: 0.4, commanded: 0.6 })).toBe(
      'opening, 40%',
    );
    expect(valveStateWords({ open: true, opening: 0.3, commanded: 0.1 })).toBe(
      'closing, 30%',
    );
    expect(valveStateWords({ open: false, opening: 0, commanded: 0.3 })).toBe(
      'opening, 0%',
    );
    // Arrived: no longer moving.
    expect(valveStateWords({ open: true, opening: 0.3, commanded: 0.3 })).toBe(
      'part open, 30%',
    );
  });
  it('leaves a valve with only open or shut as it is', () => {
    expect(valveStateWords({ open: true })).toBe('open');
    expect(valveStateWords({ open: false })).toBe('shut');
  });
});

/** The world with pool 2's exchanger valve at `at`, driven toward `to`. */
function withExchangerValve(at: number, to = at): World {
  const world = newWorld();
  return {
    ...world,
    poolTemperatureControls: {
      ...world.poolTemperatureControls,
      pool_02: {
        ...world.poolTemperatureControls.pool_02!,
        valvePosition: at,
        commandedPosition: to,
      },
    },
  };
}

describe('every surface reads a valve where it is (#29)', () => {
  it("reads a pool exchanger's modulating LTHW valve from its controller", () => {
    expect(inspectionStatus(withExchangerValve(0), 'PL2-HX1-CV1')).toBe('shut');
    expect(inspectionStatus(withExchangerValve(0.3), 'PL2-HX1-CV1')).toBe(
      'part open, 30%',
    );
    expect(inspectionStatus(withExchangerValve(1), 'PL2-HX1-CV1')).toBe('open');
    expect(inspectionStatus(withExchangerValve(0.3, 0.5), 'PL2-HX1-CV1')).toBe(
      'opening, 30%',
    );
    expect(describeForWorld(withExchangerValve(0.3), 'PL2-HX1-CV1')).toContain(
      'Currently part open, 30%.',
    );
  });
  it("reads the Lounge's actuated valves by their travel", () => {
    const world = newWorld();
    const travelled = (travel: number): World => ({
      ...world,
      loungeValvePositions: {
        ...world.loungeValvePositions,
        'valve-0001': travel,
      },
    });
    expect(inspectionStatus(travelled(0.5), 'PL1-F1-IV1')).toBe(
      'part open, 50%',
    );
    expect(inspectionStatus(travelled(1), 'PL1-F1-IV1')).toBe('open');
    expect(inspectionStatus(travelled(0), 'PL1-F1-IV1')).toBe('shut');
  });
  it('keeps an on/off installed valve open or shut', () => {
    const world = newWorld();
    const shut: World = {
      ...world,
      installedValves: { ...world.installedValves, 'valve-0070': false },
    };
    expect(inspectionStatus(world, 'PL2-HX1-IV3')).toBe('open');
    expect(inspectionStatus(shut, 'PL2-HX1-IV3')).toBe('shut');
  });
});

it('gives every valve kind its state, by its template, not a list of names (#52)', () => {
  const world = newWorld();
  // The dosing pot's lever ball valves (kind ball-valve, PR #48), shut.
  for (const tag of ['BH-DP1-IV1', 'BH-DP1-IV2', 'BH-DP1-DV1'])
    expect(inspectionStatus(world, tag), tag).toBe('shut');
  // A gas ball valve and a butterfly valve, as before.
  expect(inspectionStatus(world, 'BH-B1-IV1')).toBe('open');
  expect(inspectionStatus(world, 'BH-HW1-IV1')).toBe('open');
});

it('describes the pool exchangers’ modulating valves as regulating control valves (#33)', async () => {
  const { inspectComponent } = await import('./component-inspection');
  const world = newWorld();
  for (const tag of ['PL1-HX1-CV1', 'PL2-HX1-CV1']) {
    const lines = inspectComponent({ tag }, world)!;
    expect(lines.title, tag).toContain('modulating control valve');
    expect(lines.title, tag).not.toContain('butterfly');
    expect(describeForWorld(world, tag), tag).toMatch(/^Regulates /);
  }
  // An isolating valve still isolates.
  expect(describeForWorld(world, 'PL2-HX1-IV3')).toMatch(/^Isolates /);
});
