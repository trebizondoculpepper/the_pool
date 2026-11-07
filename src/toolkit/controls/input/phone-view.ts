import {
  Group,
  Euler,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Raycaster,
  Quaternion,
  Vector2,
  Vector3,
} from 'three';
import type { Material, Object3D, PerspectiveCamera, Texture } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { PhoneFrame } from '../logic/phone-menu';
import { phoneFraming } from '../logic/phone-framing';
import { phoneHandMotion, phoneWalkActivity } from '../logic/phone-hand-motion';
import {
  PHONE_TEXTURE_SIZE,
  phoneDisplayTouch,
  phoneKeyTouch,
} from '../logic/phone-input';
import type { PhoneTouch } from '../logic/phone-input';
import { PLAIN_USE } from '../logic/use-cue';
import { markUsable } from './use-marking';
import { aimCache, resolveAim } from './resolve-aim';
import { createPhoneDisplay } from './phone-display';

const handsetUrl = `${import.meta.env.BASE_URL}models/phone/scene.gltf`;
const offset = new Vector3();
const swayRotation = new Quaternion();
const swayEuler = new Euler();
const PHONE_REACH_METRES = 4;

/** Draw the small, licensed handset over the room, with a replaceable black screen. */
export function createPhoneView(
  scene: Object3D | undefined,
  camera: PerspectiveCamera,
  metre: number,
  onTouch: (touch: PhoneTouch) => void,
) {
  const anchor = new Group();
  anchor.name = 'Held phone';
  // The supplied glTF has a 0.069 root scale. Its camera-space scale is
  // recomputed below so the handset behaves like an overlay across FOVs.
  anchor.visible = false;
  scene?.add(anchor);
  let loaded: Object3D | null = null;
  let loading = false;
  let disposed = false;
  let raised = false;
  let lift = 0;
  let motionSeconds = 0;
  let walking = 0;
  let buttons: Object3D | null = null;
  let screen: Mesh<PlaneGeometry> | null = null;
  let shownFrame: PhoneFrame | null = null;
  const owned: Material[] = [];
  const textures = new Set<Texture>();
  const display = createPhoneDisplay();
  const ray = new Raycaster();
  const pointer = new Vector2();
  const cache = aimCache(0);
  const pointTouch = (point: Vector3): PhoneTouch | null => {
    if (!raised || !buttons || !shownFrame) return null;
    if (screen) {
      const displayPoint = screen.worldToLocal(point.clone());
      const { width, height } = screen.geometry.parameters;
      if (
        Math.abs(displayPoint.x) <= width / 2 &&
        Math.abs(displayPoint.y) <= height / 2
      )
        return phoneDisplayTouch(
          shownFrame,
          ((displayPoint.x + width / 2) / width) * PHONE_TEXTURE_SIZE,
          ((height / 2 - displayPoint.y) / height) * PHONE_TEXTURE_SIZE,
        );
    }
    const local = buttons.worldToLocal(point.clone());
    return phoneKeyTouch(local.x, local.y);
  };
  const unmark = markUsable(
    anchor,
    ({ point }) => (pointTouch(point) ? PLAIN_USE : null),
    ({ point }) => {
      const touch = pointTouch(point);
      if (touch) onTouch(touch);
    },
  );

  // Keep the handset ahead of the world while preserving depth between its parts.
  const foreground = (source: Material) => {
    const material = source.clone();
    const own = material.onBeforeCompile.bind(material);
    material.onBeforeCompile = (shader, renderer) => {
      own(shader, renderer);
      shader.vertexShader = shader.vertexShader.replace(
        /}\s*$/,
        '  gl_Position.z = gl_Position.z * 0.02 - gl_Position.w * 0.98;\n}',
      );
    };
    const key = source.customProgramCacheKey.bind(source);
    material.customProgramCacheKey = () => `${key()}|phone-foreground`;
    owned.push(material);
    return material;
  };

  const load = async () => {
    if (loading || loaded || !scene) return;
    loading = true;
    try {
      const gltf = await new GLTFLoader().loadAsync(handsetUrl);
      if (disposed) {
        gltf.scene.traverse((part) => {
          if (!(part instanceof Mesh)) return;
          part.geometry.dispose();
          const material = part.material as Material & { map?: Texture };
          material.map?.dispose();
          material.dispose();
        });
        return;
      }
      loaded = gltf.scene;
      loaded.traverse((part) => {
        if (!(part instanceof Mesh)) return;
        const screen = part.parent?.name === 'glassFront_low';
        const source = part.material as Material & { map?: Texture };
        if (source.map) textures.add(source.map);
        if (screen) part.visible = false;
        else part.material = foreground(source);
        part.renderOrder = 1000;
        part.frustumCulled = false;
      });
      const glass = loaded.getObjectByName('glassFront_low');
      buttons = loaded.getObjectByName('buttons_low') ?? null;
      if (glass) {
        // The glass mesh spans 0.575 × 0.604. Inset the live display inside
        // the raised bezel so its outer pixels cannot disappear under it.
        const screenGeometry = new PlaneGeometry(0.53, 0.55);
        const base = new MeshBasicMaterial({ map: display.texture });
        screen = new Mesh(screenGeometry, foreground(base));
        base.dispose();
        screen.name = 'Phone display';
        screen.position.set(0, 0.337, 0.161);
        screen.renderOrder = 1001;
        screen.frustumCulled = false;
        glass.add(screen);
      }
      anchor.add(loaded);
    } catch (error) {
      console.warn('The phone model could not be loaded.', error);
    } finally {
      loading = false;
    }
  };

  return {
    show(frame: PhoneFrame) {
      shownFrame = frame;
      display.show(frame);
    },
    setRaised(on: boolean) {
      raised = on;
      if (on) void load();
    },
    owns(object: Object3D) {
      return object === anchor;
    },
    resolveAt(x: number, y: number) {
      if (!raised || !loaded) return null;
      anchor.updateMatrixWorld(true);
      return resolveAim({
        scene: anchor,
        camera,
        metre,
        x,
        y,
        reach: PHONE_REACH_METRES,
        now: performance.now(),
        ray,
        pointer,
        cache,
        fresh: true,
      });
    },
    targetAt(point: Vector3) {
      return pointTouch(point);
    },
    activate(touch: PhoneTouch) {
      if (raised) onTouch(touch);
    },
    update(delta: number, walkRate = 0, reducedMotion = false) {
      const target = raised ? 1 : 0;
      lift += Math.max(-delta * 5, Math.min(delta * 5, target - lift));
      anchor.visible = lift > 0.001;
      if (!anchor.visible) {
        walking = 0;
        return;
      }
      motionSeconds += delta;
      walking = phoneWalkActivity(walking, walkRate, delta);
      const motion = phoneHandMotion(motionSeconds, walking, reducedMotion);
      // Model +Z is its face. The camera looks down -Z, so +Z faces the eye.
      const frame = phoneFraming(
        camera.fov,
        camera.zoom,
        camera.aspect,
        window.innerWidth / window.innerHeight,
        lift,
      );
      anchor.scale.setScalar(frame.scale * metre);
      offset.set(
        (frame.x + motion.x) * metre,
        (frame.y + motion.y) * metre,
        (frame.z + motion.z) * metre,
      );
      anchor.position
        .copy(camera.position)
        .add(offset.applyQuaternion(camera.quaternion));
      anchor.quaternion.copy(camera.quaternion);
      swayEuler.set(motion.pitch, motion.yaw, motion.roll);
      anchor.quaternion.multiply(swayRotation.setFromEuler(swayEuler));
    },
    dispose() {
      disposed = true;
      unmark();
      anchor.removeFromParent();
      loaded?.traverse((part) => {
        if (part instanceof Mesh) part.geometry.dispose();
      });
      for (const material of owned) material.dispose();
      for (const texture of textures) texture.dispose();
      display.dispose();
    },
  };
}
