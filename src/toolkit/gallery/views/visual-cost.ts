import { Box3, Group, PerspectiveCamera, Scene, Vector3 } from 'three';
import type { Object3D, WebGLRenderer } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createFarVersion } from '../../components/core/views/far-version';
import { medianOf, uploadTexels } from '../logic/component-bench';
import { loadRecord, saveRecord } from '../logic/visual-cost';
import type {
  CostRecord,
  KeyValueStore,
  VisualCost,
} from '../logic/visual-cost';
import { resources } from './gpu-resources';
import {
  rescanDisplays,
  signsFading,
} from '../../components/core/views/display-reach';
import type { MagicAdapter, MagicItem } from './magic-adapters';

/**
 * Mission 135: an item's HIGH and LOW versions, and their visual cost
 * measured as the component benchmark (mission 094) measures it: draw calls
 * and triangles from the renderer's own count of one frame of the item
 * alone, its materials, textures and their bytes by the benchmark's own
 * `resources`, its update's cost as the median of six batches of twenty,
 * and its texture uploads over a second's running.
 */

/** The browser's store, or none where it refuses (a private window). */
export function viewerStore(): KeyValueStore | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

export const lastMeasurement = (kind: string): CostRecord | null =>
  loadRecord(viewerStore(), kind);
export const keepMeasurement = (record: CostRecord) =>
  saveRecord(viewerStore(), record);

/** The item's LOW version: its own hand-made one where it has one, else its far version. */
export interface LowVersion {
  object: Object3D;
  dispose(): void;
}
export function lowVersionOf(
  adapter: MagicAdapter,
  kit: PanelKit,
  high: MagicItem,
): LowVersion {
  if (adapter.buildLow) {
    const own = adapter.buildLow(kit);
    return { object: own.object, dispose: () => own.dispose?.() };
  }
  const far = createFarVersion(high.object, {
    name: `${adapter.title} (low)`,
  });
  return { object: far.group, dispose: far.dispose };
}

const nextFrame = () =>
  new Promise<number>((resolve) => requestAnimationFrame(resolve));

/**
 * One version's cost: `object` is drawn alone in a scene of its own,
 * framed from in front as the benchmark frames it, by `renderer`.
 */
export async function measureVisualCost(
  renderer: WebGLRenderer,
  object: Object3D,
  update: ((delta: number) => void) | undefined,
  { seconds = 1 } = {},
): Promise<VisualCost> {
  const scene = new Scene();
  const holder = new Group();
  const parent = object.parent;
  const wasVisible = object.visible;
  // Measured where it is, its world placement kept.
  object.updateWorldMatrix(true, false);
  holder.matrix.copy(parent?.matrixWorld ?? holder.matrix);
  holder.matrixAutoUpdate = false;
  holder.add(object);
  object.visible = true;
  scene.add(holder);
  scene.updateMatrixWorld(true);
  const box = new Box3().setFromObject(object);
  const size = box.getSize(new Vector3());
  const middle = box.getCenter(new Vector3());
  const reach = Math.max(size.x, size.y, 0.05) * 1.3 + size.z;
  const camera = new PerspectiveCamera(50, 1, Math.max(0.001, reach / 100));
  camera.far = reach * 10 + size.z * 2;
  camera.position.set(middle.x, middle.y, box.max.z + reach);
  camera.updateProjectionMatrix();
  camera.lookAt(middle);
  const gl = renderer.getContext() as WebGL2RenderingContext;
  const counts = { uploads: 0, texels: 0 };
  const originals = (['texImage2D', 'texSubImage2D'] as const).map((method) => {
    const original = gl[method];
    (gl as unknown as Record<string, unknown>)[method] = (
      ...args: unknown[]
    ) => {
      if (args[1] === 0) counts.uploads += 1;
      counts.texels += uploadTexels(method, args);
      return (original as (...a: unknown[]) => unknown).apply(gl, args);
    };
    return [method, original] as const;
  });
  const autoReset = renderer.info.autoReset;
  try {
    // Warm: its first uploads and shader compiles (a program still
    // compiling is skipped by the renderer, and its draws not counted).
    update?.(0);
    await renderer.compileAsync(scene, camera);
    renderer.render(scene, camera);
    await nextFrame();
    update?.(1 / 60);
    renderer.info.autoReset = true;
    renderer.render(scene, camera);
    const drawCalls = renderer.info.render.calls;
    const triangles = renderer.info.render.triangles;
    const r = resources(object);
    let updateUs = 0;
    if (update) {
      const batches: number[] = [];
      for (let b = 0; b < 6; b++) {
        const t = performance.now();
        for (let i = 0; i < 20; i++) update(1 / 60);
        batches.push(((performance.now() - t) / 20) * 1000);
      }
      updateUs = medianOf(batches);
    }
    // Its signs settled at this camera's distance, as the benchmark waits
    // for them: their fades, begun by its framing, are not its running cost.
    rescanDisplays(scene);
    for (let k = 0; k < 150 && signsFading(); k++) {
      await nextFrame();
      update?.(1 / 60);
      renderer.render(scene, camera);
    }
    // Running, as in the game: its uploads a second.
    counts.uploads = counts.texels = 0;
    let last = await nextFrame();
    const start = last;
    while (last - start < seconds * 1000) {
      const now = await nextFrame();
      update?.(Math.min(0.1, (now - last) / 1000));
      renderer.render(scene, camera);
      last = now;
    }
    const secs = Math.max(0.001, (last - start) / 1000);
    return {
      drawCalls,
      triangles,
      materials: r.materials.size,
      textures: r.textures.size,
      textureBytes: r.bytes,
      live: Boolean(update),
      updateUs,
      uploadsPerS: counts.uploads / secs,
      texelsPerS: counts.texels / secs,
    };
  } finally {
    for (const [method, original] of originals)
      (gl as unknown as Record<string, unknown>)[method] = original;
    renderer.info.autoReset = autoReset;
    holder.remove(object);
    object.visible = wasVisible;
    parent?.add(object);
  }
}
