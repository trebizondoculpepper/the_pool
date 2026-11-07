import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { createPanelKit } from '../../components/core/views/eighties-controls';
import { useRegistrationOf } from '../../controls/input/use-marking';
import { createRoomServices } from './room-services';

/**
 * #107: a room's services (each switch-fuse's handle, door and carriers)
 * are registered with the one click resolver as they are set, so they
 * click in a room with no walk of its own (the shell rooms since #46).
 */

beforeEach(() => {
  vi.stubGlobal('document', {
    createElement: () => {
      const canvas = { width: 0, height: 0, getContext: () => context };
      const context = new Proxy(
        { canvas, measureText: (text: string) => ({ width: text.length * 7 }) },
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

describe('a room’s services click through the one resolver (#107)', () => {
  it('every use in the boiler house’s services has a registration with an action', () => {
    const services = createRoomServices(createPanelKit(), 'boiler_house');
    const objects = [...services.uses.keys()];
    expect(objects.length).toBeGreaterThan(0);
    for (const object of objects)
      expect(useRegistrationOf(object)?.action, object.name).toBeTypeOf(
        'function',
      );
  });
});
