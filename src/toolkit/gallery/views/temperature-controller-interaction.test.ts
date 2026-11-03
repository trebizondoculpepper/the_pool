import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { Box3, Raycaster, Vector3 } from 'three';
import type { Object3D } from 'three';
import { createPanelKit } from '../../components/core/views/eighties-controls';
import { createTemperatureControllerPlaceholder } from '../../components/plant/views/temperature-controller-placeholder';
import type { ControllerModel } from '../../components/plant/logic/modulating-control';

beforeEach(() => {
  vi.stubGlobal('document', {
    createElement: () => {
      const canvas = { width: 0, height: 0, getContext: () => context };
      const gradient = () => ({ addColorStop() {} });
      const context = new Proxy(
        {
          canvas,
          measureText: (text: string) => ({ width: text.length * 7 }),
          createRadialGradient: gradient,
          createLinearGradient: gradient,
        },
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

describe('Water Margin controller controls', () => {
  it('lets a front-facing use ray reach all three dials and turn their bound values', () => {
    const model: ControllerModel = {
      measured: 27,
      setpoint: 28,
      band: 2,
      output: 0.5,
      mode: 'auto',
    };
    const controller = createTemperatureControllerPlaceholder(
      createPanelKit(),
      {
        tag: 'PL1-TC1',
        model: () => model,
        change(edit) {
          Object.assign(model, edit);
        },
      },
    );
    controller.group.updateMatrixWorld(true);
    const click = (name: string, direction: number) => {
      const part = controller.group.getObjectByName(`PL1-TC1 ${name}`)!;
      const centre = new Box3().setFromObject(part).getCenter(new Vector3());
      const ray = new Raycaster(
        new Vector3(centre.x, centre.y, 1),
        new Vector3(0, 0, -1),
      );
      const hit = ray.intersectObject(controller.group, true)[0];
      expect(hit, `${name} ray hit`).toBeTruthy();
      let use: ((direction?: number) => void) | undefined;
      for (let o: Object3D | null = hit.object; o; o = o.parent) {
        use = controller.parts.uses.get(o);
        if (use) break;
      }
      expect(use, `${name} reachable through the use ray`).toBeTruthy();
      use!(direction);
      controller.parts.update(0);
    };

    click('mode selector', -1);
    expect(model.mode).toBe('off');
    click('mode selector', -1);
    expect(model.mode).toBe('hand');
    click('mode selector', 1);
    expect(model.mode).toBe('off');
    click('mode selector', 1);
    expect(model.mode).toBe('auto');
    click('set point dial', 1);
    expect(model.setpoint).toBe(28.5);
    click('band dial', 1);
    expect(model.band).toBe(3);
    controller.dispose();
  });
});
