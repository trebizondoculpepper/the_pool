import { Group, Mesh, MeshBasicMaterial, PlaneGeometry, Vector3 } from 'three';
import type { Material, Object3D, PerspectiveCamera, Texture } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { PhoneFrame } from '../logic/phone-menu';
import { createPhoneDisplay } from './phone-display';

const handsetUrl = `${import.meta.env.BASE_URL}models/phone/scene.gltf`;
const offset = new Vector3();

/** Draw the small, licensed handset over the room, with a replaceable black screen. */
export function createPhoneView(
  scene: Object3D | undefined,
  camera: PerspectiveCamera,
  metre: number,
) {
  const anchor = new Group();
  anchor.name = 'Held phone';
  // The supplied glTF has a 0.069 root scale; the enlarged phone reads well
  // close to the camera, with its lower third below the viewport.
  anchor.scale.setScalar(3.8 * metre);
  anchor.visible = false;
  scene?.add(anchor);
  let loaded: Object3D | null = null;
  let loading = false;
  let disposed = false;
  let raised = false;
  let lift = 0;
  const owned: Material[] = [];
  const textures = new Set<Texture>();
  const display = createPhoneDisplay();

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
      if (glass) {
        const screenGeometry = new PlaneGeometry(0.575, 0.604);
        const base = new MeshBasicMaterial({ map: display.texture });
        const screen = new Mesh(screenGeometry, foreground(base));
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
      display.show(frame);
    },
    setRaised(on: boolean) {
      raised = on;
      if (on) void load();
    },
    update(delta: number) {
      const target = raised ? 1 : 0;
      lift += Math.max(-delta * 5, Math.min(delta * 5, target - lift));
      anchor.visible = lift > 0.001;
      if (!anchor.visible) return;
      // Model +Z is its face. The camera looks down -Z, so +Z faces the eye.
      offset.set(
        camera.aspect < 0.8 ? 0.08 * metre : 0.3 * metre,
        (-0.8 + 0.58 * lift) * metre,
        -0.7 * metre,
      );
      anchor.position
        .copy(camera.position)
        .add(offset.applyQuaternion(camera.quaternion));
      anchor.quaternion.copy(camera.quaternion);
    },
    dispose() {
      disposed = true;
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
