import { describe, expect, it } from 'vite-plus/test';
import { newWorld } from '../../../../game/world';
import { simGraph } from './index';
import { nodePage } from './node-page';

const page = (id: string) => nodePage(simGraph(), id, { world: newWorld() })!;

describe('the example node pages', () => {
  it('the Jacuzzi drain valve: coupled state, its action, its controls, its runs', () => {
    const p = page('plant_pool_03/fitting:jacuzzi.drain');
    expect(p.what.kind).toBe('isolating-valve');
    expect(p.state.fields.map((f) => [f.name, f.normal])).toEqual([
      ['open', 'false'],
      ['drainDown', 'false'],
    ]);
    expect(p.change.drivers[0].what).toContain('pool/drain-down');
    expect(p.change.eventSource).toBe('valveEvents');
    expect(p.related.controls.length).toBeGreaterThan(0);
    expect(p.related.upstream.map((u) => u.far)).toContain(
      'plant_pool_03/node:cabinet',
    );
    expect(p.connect.runs.map((r) => r.run.id)).toContain(
      'run:plant_pool_03/Drain to waste/1',
    );
  });
  it('the cabinet pump: state, trip, the POWER switch on its parent', () => {
    const p = page('plant_pool_03/part:cabinet/pump');
    expect(p.state.fields.find((f) => f.name === 'running')?.value).toBe(true);
    expect(p.related.parentControls.some((c) => c.label === 'POWER')).toBe(
      true,
    );
    expect(p.change.eventSource).toBe('watcherEvents');
    expect(p.related.upstream.map((u) => u.far)).toEqual(
      expect.arrayContaining(['plant_pool_03/node:cabinet']),
    );
    // Direct neighbours only on the page.
    expect(p.related.upstream.map((u) => u.far)).not.toContain(
      'plant_pool_03/node:switch-fuse',
    );
  });
  it('the main incoming supply: its power, its downstream, MAINS FAIL on both control rooms', () => {
    const p = page('switch_room/node:incoming');
    expect(p.state.fields.map((f) => f.path)).toEqual(['plant.sources.power']);
    expect(p.related.downstream.map((d) => d.far)).toEqual(
      expect.arrayContaining([
        'switch_room/node:main-switch',
        'control_room/alarm:mains-fail',
      ]),
    );
    expect(p.related.alarms[0].both).toBe(true);
    expect(p.flags['alarm-not-both']).toBe('no');
  });
  it('the mains-fail alarm: its source, its window, both rooms, not invisible', () => {
    const p = page('control_room/alarm:mains-fail');
    expect(p.related.upstream.map((u) => u.far)).toEqual([
      'switch_room/node:incoming',
    ]);
    expect(p.state.fields[0].value).toBe('off');
    expect(new Set(p.world.representations.map((r) => r.room))).toEqual(
      new Set(['control_room', 'bridge']),
    );
    expect(p.flags['alarm-not-both']).toBe('no');
    expect(p.flags.invisible).toBe('no');
    expect(
      p.world.representations.every((r) => r.link.includes('bench=room-audit')),
    ).toBe(true);
  });
});
