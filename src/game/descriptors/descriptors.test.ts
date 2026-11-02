import { describe, expect, it } from 'vite-plus/test';
import { applyAction, newWorld } from '../world';
import type { World } from '../world';
import { MODEL_VALVES } from '../plant/model-valves';
import { mainPoolMimicCommand } from '../../toolkit/gallery/logic/pool-mimics';
import { applyPreset, initialView, readAll } from './descriptor';
import type { ObjectDescriptor } from './descriptor';
import { JACUZZI_ROOM_VALVES } from './jacuzzi-room';
import {
  controlFor,
  descriptorFor,
  kindControls,
  objectDescriptors,
} from './registry';

const pl3 = () => objectDescriptors('plant_pool_03');
const cr = () => objectDescriptors('control_room');
const preset = (d: ObjectDescriptor, id: string) =>
  d.presets.find((p) => p.id === id)!;

describe('the Jacuzzi plant room', () => {
  it('describes its cabinet, isolator, valve panel, tanks and all 18 valves', () => {
    const refs = pl3().map((d) => d.ref);
    for (const ref of [
      'PL3-CAB1',
      'PL3-CAB1-IS1',
      'valve-panel',
      'PL3-BT1',
      'PL3-DT1',
      'PL3-DT2',
    ])
      expect(refs).toContain(ref);
    const valves = MODEL_VALVES.filter(
      (v) => v.room === 'plant_pool_03' && v.kind === 'isolating-valve',
    );
    expect(valves).toHaveLength(18);
    expect(JACUZZI_ROOM_VALVES).toHaveLength(18);
    for (const v of valves) expect(refs).toContain(v.tag);
  });

  it('turns POWER off through the world, and the panel goes dark but for its supply', () => {
    const power = controlFor('PL3-CAB1/power')!;
    const cab = descriptorFor('PL3-CAB1')!;
    let w = newWorld();
    expect(power.position!(w)).toBe('on');
    w = applyAction(w, power.action!(w, 'off')!);
    expect(power.position!(w)).toBe('off');
    expect(readAll(cab, w)['pump-run']).toBe(false);
  });

  it('opens and shuts each valve, its position showing it', () => {
    for (const v of JACUZZI_ROOM_VALVES) {
      const d = descriptorFor(v.tag)!;
      const shut = applyPreset(newWorld(), preset(d, 'shut'));
      expect(readAll(d, shut).position).toBe('shut');
      const open = applyPreset(shut, preset(d, 'open'));
      expect(readAll(d, open).position).toBe('open');
    }
  });

  it('works the motorised valves from the panel and the override alike', () => {
    const suction = JACUZZI_ROOM_VALVES.find(
      (v) => v.id === 'jacuzzi.suction',
    )!;
    const shut = controlFor(`valve-panel/${suction.tag}-shut`)!;
    const override = controlFor(`${suction.tag}/override`)!;
    let w = newWorld();
    w = applyAction(w, shut.action!(w, 'press')!);
    expect(override.position!(w)).toBe('shut');
    w = applyAction(w, override.action!(w, 'press')!);
    expect(override.position!(w)).toBe('open');
  });

  it('keeps the drain valve the pool’s drain-down', () => {
    const drain = JACUZZI_ROOM_VALVES.find((v) => v.id === 'jacuzzi.drain')!;
    const w = newWorld();
    expect(
      controlFor(`valve-panel/${drain.tag}-open`)!.action!(w, 'press'),
    ).toEqual({ type: 'pool/drain-down', pool: 'pool_03', open: true });
  });

  it('switches the isolator off', () => {
    const handle = controlFor('PL3-CAB1-IS1/handle')!;
    const w = applyAction(newWorld(), handle.action!(newWorld(), 'off')!);
    expect(handle.position!(w)).toBe('off');
    expect(readAll(descriptorFor('PL3-CAB1')!, w).display).toBeNull();
  });

  it('gives each preset the state it promises', () => {
    const cab = descriptorFor('PL3-CAB1')!;
    const inService = applyPreset(newWorld(), preset(cab, 'in-service'));
    const tripped = applyPreset(newWorld(), preset(cab, 'tripped'));
    expect(readAll(cab, tripped)['no-flow']).toBe(true);
    const doors = preset(cab, 'doors-open');
    expect(
      readAll(cab, inService, { ...initialView(cab), ...doors.view }).uv,
    ).toBe(false);
    expect(readAll(descriptorFor('PL3-BT1')!, inService).gauge).toBeTypeOf(
      'number',
    );
    expect(readAll(descriptorFor('PL3-DT1')!, inService).level).toBeTypeOf(
      'number',
    );
  });

  it('steps the thermostat half a degree, clamped', () => {
    const up = controlFor('PL3-CAB1/set-up')!;
    const w = newWorld();
    const after = applyAction(w, up.action!(w, 'press')!);
    expect(after.pools.pool_03.setpoint).toBe(w.pools.pool_03.setpoint + 0.5);
  });
});

describe('the control room’s mimics', () => {
  it('describes its spec-driven boards', () => {
    expect(cr().map((d) => d.ref)).toEqual([
      'CR-MP1',
      'CR-MP2',
      'CR-MP6',
      'CR-MP7',
      'CR-MP8',
      'CR-MP9',
    ]);
  });

  it('sends the main pool board’s START and STOP as its command function does', () => {
    const w = newWorld();
    for (const id of ['p1-start', 'p1-stop', 'p2-start', 'p2-stop'])
      expect(controlFor(`CR-MP1/${id}`)!.action!(w, 'press')).toEqual(
        mainPoolMimicCommand(id, 'pool_02'),
      );
    expect(controlFor('CR-MP1/p1-start')!.targets).toEqual(['P-101A']);
  });

  it('sends the boiler board’s START to the boiler house, and leaves CR-MP6’s buttons inert', () => {
    const w = newWorld();
    expect(controlFor('CR-MP7/start')!.action!(w, 'press')).toEqual({
      type: 'boiler-house',
      action: { act: 'run', run: true },
    });
    const lounge = descriptorFor('CR-MP6')!;
    for (const c of lounge.controls)
      expect(c.action?.(w, 'press') ?? null).toBeNull();
  });

  it('reads its readouts in the mode shown', () => {
    const d = descriptorFor('CR-MP1')!;
    const w = newWorld();
    const flow = readAll(d, w, { mode: 'flow' });
    expect(typeof flow.pumps === 'number' || flow.pumps === null).toBe(true);
    expect(d.presets.map((p) => p.id)).toEqual([
      'flow',
      'pressure',
      'temperature',
      'water',
    ]);
  });
});

describe('every descriptor', () => {
  it('has unique control ids in the ref form', () => {
    const ids = objectDescriptors().flatMap((d) =>
      d.controls.map((c) => {
        expect(c.ref).toBe(`${d.ref}/${c.key}`);
        return `${d.room}|${c.ref}`;
      }),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('maps every control input to a world action the world accepts, or a declared view change', () => {
    const w: World = newWorld();
    for (const d of objectDescriptors())
      for (const c of d.controls) {
        expect(c.action || c.view, c.ref).toBeTruthy();
        for (const input of c.inputs) {
          const action = c.action?.(w, input) ?? null;
          if (action) expect(() => applyAction(w, action), c.ref).not.toThrow();
        }
      }
  });

  it('shows a kind’s controls for the catalogue', () => {
    expect(kindControls('jacuzzi-pack').map((c) => c.key)).toContain('power');
    expect(kindControls('butterfly-valve').map((c) => c.key)).toEqual(
      expect.arrayContaining(['handle', 'override']),
    );
  });
});
