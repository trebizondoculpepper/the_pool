import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import type { Object3D } from 'three';
import { createPanelKit } from '../../components/core/views/eighties-controls';
import { createPartSet } from '../../components/core/parts/parts';
import {
  CO2_DOSERS,
  newCo2Doser,
  setCo2Hand,
  setCo2Override,
} from '../../../game/plant/co2-dosing';
import type { Co2Doser } from '../../../game/plant/co2-dosing';
import { createMassFlowController } from './co2-mass-flow-controller';

beforeEach(() => {
  vi.stubGlobal('document', {
    createElement: () => {
      const canvas = { width: 0, height: 0, getContext: () => context };
      const context = new Proxy(
        { canvas, measureText: (t: string) => ({ width: t.length * 7 }) },
        {
          get: (target, key) =>
            key in target ? Reflect.get(target, key) : () => {},
        },
      );
      return canvas;
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('the mass flow controller’s rotary selectors', () => {
  const build = () => {
    let doser: Co2Doser = newCo2Doser(CO2_DOSERS.plant_pool_02);
    const parts = createPartSet();
    createMassFlowController(
      createPanelKit(),
      () => ({ doser, inletBar: 2 }),
      {
        setHand: (hand) => (doser = setCo2Hand(doser, hand)),
        setManualRate: () => {},
        setOverride: (o) => (doser = setCo2Override(doser, o)),
      },
      parts,
    );
    // The use of the part `label` names: the one on an object under it.
    const use = (label: string) => {
      const named = (o: Object3D | null): boolean =>
        !!o && (o.name.endsWith(label) || named(o.parent));
      return [...parts.uses].find(([o]) => named(o))![1];
    };
    return { doser: () => doser, use };
  };

  it('turns LOCAL · REMOTE anticlockwise to LOCAL and clockwise to REMOTE', () => {
    const { doser, use } = build();
    const turn = use('LOCAL · REMOTE selector');
    expect(doser().hand).toBe(false);
    turn(-1);
    expect(doser().hand).toBe(true);
    turn(-1);
    expect(doser().hand).toBe(true);
    turn(1);
    expect(doser().hand).toBe(false);
  });

  it('turns the OVERRIDE key a detent at a time, CLOSE · NORM · OPEN', () => {
    const { doser, use } = build();
    const turn = use('valve OVERRIDE key selector');
    expect(doser().override).toBe('normal');
    turn(1);
    expect(doser().override).toBe('open');
    turn(1);
    expect(doser().override).toBe('open');
    turn(-1);
    turn(-1);
    expect(doser().override).toBe('close');
    turn(1);
    expect(doser().override).toBe('normal');
  });
});
