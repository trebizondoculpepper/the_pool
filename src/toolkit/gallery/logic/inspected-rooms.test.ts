import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { Group, PerspectiveCamera, Scene } from 'three';
import type { Object3D } from 'three';
import {
  createRoomController,
  roomInspectorFor,
  useRoomInspector,
} from '../../controls/input/room-controller';
import type {
  RoomInspectorFactory,
  RoomInspectorOptions,
} from '../../controls/input/room-controller';

/**
 * The information overlay's contract (mission 160; prompt 061): the room
 * factory installs the inspector for every room, so no room starter passes
 * `inspect` itself, and the factory's inspector is asked with the room's
 * own scene, camera and metre. The guard that once kept `INSPECTED_ROOMS`
 * true (`inspected-rooms.slow.test.ts`) is gone with the opt-in.
 */

/** A fake room starter's source, checked for a passing `inspect`. */
const STARTERS = import.meta.glob<string>(
  ['../rooms/*.ts', '../views/magic-room.ts', '../../../rendering/*.ts'],
  { query: '?raw', import: 'default', eager: true },
);

/**
 * Enough of a browser for one room controller (the shared audit's stub is
 * for room builders, which never make a controller): canvases with a 2-D
 * context, and elements that hear and carry attributes, with a parent to
 * hold the HUD.
 */
function stubControllerBrowser() {
  const listen = {
    addEventListener() {},
    removeEventListener() {},
    setAttribute() {},
    getAttribute: () => null,
    setPointerCapture() {},
    releasePointerCapture() {},
    appendChild(child: unknown) {
      return child;
    },
    append() {},
    removeChild() {},
    remove() {},
    closest: () => null,
    querySelectorAll: () => [],
    querySelector: () => null,
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }),
  };
  const context = () =>
    new Proxy(
      {
        measureText: (text: string) => ({ width: text.length * 7 }),
        createRadialGradient: () => ({ addColorStop() {} }),
        createLinearGradient: () => ({ addColorStop() {} }),
        getImageData: () => ({ data: new Uint8ClampedArray(4) }),
        createImageData: () => ({
          width: 256,
          height: 256,
          data: new Uint8ClampedArray(256 * 256 * 4),
        }),
        putImageData: () => {},
      },
      { get: (target, key) => (key in target ? target[key as never] : () => {}) },
    );
  const element = (tag: string) => {
    const el = {
      ...listen,
      nodeName: tag.toUpperCase(),
      style: {},
      dataset: {},
      hidden: false,
      textContent: '',
      innerHTML: '',
      title: '',
      scrollIntoView() {},
      focus() {},
      getContext: () => context(),
      width: 0,
      height: 0,
      parentElement: null as unknown,
    };
    if (tag === 'canvas') {
      const parent = { ...listen, appendChild() {}, style: {}, dataset: {} };
      el.parentElement = parent;
    }
    return el;
  };
  vi.stubGlobal('window', {
    ...listen,
    setTimeout,
    clearTimeout,
    matchMedia: () => ({ matches: false, addEventListener() {} }),
  });
  vi.stubGlobal('document', {
    ...listen,
    createElement: element,
    createElementNS: element,
    pointerLockElement: null,
    hidden: false,
    body: element('body'),
  });
} // prettier-ignore

describe('the room factory installs the information overlay everywhere', () => {
  beforeEach(stubControllerBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
    useRoomInspector(null);
  });

  it('every room starter leaves `inspect` to the factory', () => {
    const passing = Object.entries(STARTERS)
      .filter(([, source]) =>
        /\binspect:\s*(?:createInspector\s*\(|\(x,\s*y\))/.test(source),
      )
      .map(([path]) => path);
    expect(passing).toEqual([]);
  });

  it('a room’s controller builds its inspector from its own scene, camera and metre', () => {
    const scene = new Scene();
    const camera = new PerspectiveCamera();
    const canvas = document.createElement('canvas');
    const camerasSeen: unknown[] = [];
    useRoomInspector(((options: RoomInspectorOptions) => {
      expect(options.scene).toBe(scene);
      expect(options.metre).toBe(2);
      camerasSeen.push(options.camera);
      // A hit on the scene's marked thing, that the factory's overlay asks.
      return (x: number, y: number) =>
        x === 0 && y === 0 ? { key: 'kind:test', title: 'Test thing' } : null;
    }) as RoomInspectorFactory);
    createRoomController({
      scene,
      camera,
      metre: 2,
      floorY: 0,
      start: { x: 0, z: 0 },
      objects: new Group(),
      canvas,
    });
    expect(camerasSeen).toEqual([camera]);
  });

  it('a room may give the overlay its world and identify, as data', () => {
    const worldValue = { tag: 'PL1' };
    let captured: RoomInspectorOptions | undefined;
    useRoomInspector(((options: RoomInspectorOptions) => {
      captured = options;
      return null;
    }) as RoomInspectorFactory);
    const identify = (object: Group) => ({ name: object.name });
    createRoomController({
      scene: new Scene(),
      camera: new PerspectiveCamera(),
      metre: 1,
      floorY: 0,
      start: { x: 0, z: 0 },
      objects: new Group(),
      canvas: document.createElement('canvas'),
      world: () => worldValue,
      identify: identify as (object: Object3D) => unknown,
    });
    expect(captured?.world?.()).toBe(worldValue);
    expect(captured?.identify).toBe(identify);
  });

  it('with no inspector registered, the factory installs none', () => {
    expect(
      roomInspectorFor({
        scene: new Scene(),
        camera: new PerspectiveCamera(),
        metre: 1,
      }),
    ).toBeNull();
  });
});
