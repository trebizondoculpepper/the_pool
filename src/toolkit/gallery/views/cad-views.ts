import {
  Box3,
  Group,
  OrthographicCamera,
  PerspectiveCamera,
  Scene,
  Vector3,
} from 'three';
import type { Material, Mesh, Object3D, Texture } from 'three';
import { METRE } from '../../components/core/logic/units';
import {
  createPanelKit,
  disposeKit,
} from '../../components/core/views/eighties-controls';
import { ps1Uniforms } from '../../components/core/parts/ps1-material';
import {
  createRenderer,
  useEnvironment,
} from '../../components/core/parts/render-style';
import {
  CAD_GRID,
  CAD_VIEWS,
  cadCacheKey,
  cadEntryId,
  dimensionsMm,
  fingerprint,
  isFresh,
  orthoFrame,
  perspectivePose,
  scaleBar,
  sheetScale,
  viewDimensions,
} from '../logic/cad-views';
import type { Bounds, CadViewName, Dimensions } from '../logic/cad-views';
import { magicPageLink } from '../logic/item-audit';
import { cadLights } from './cad-sheet';
import { ITEM_AUDIT_SECTIONS } from './item-audit-page';
import type { MagicAdapter } from './magic-adapters';

/**
 * The item audit page's CAD views (mission 133, plan
 * `doc/plans/133-item-cad-views.md`): TOP, FRONT, SIDE and PERSPECTIVE
 * images of a kind, drawn by its own builder (130's adapter) off-screen on
 * a plain sheet under flat light, the flat views to one scale with their
 * sizes and a scale bar. Rendered in the browser the first time a page
 * opens and kept in IndexedDB under a key of what drew them, so a stale
 * image is never shown. A kind with no 3D form shows its magic page.
 */

const PIXELS = 480;
const FOV = 30;
const DB = 'pool-plant-cad-views';
const STORE = 'views';

/** What a kind's views are, once drawn. */
export interface CadSheet {
  id: string;
  key: string;
  dims: Dimensions;
  pixelsPerMetre: number;
  images: Record<CadViewName, string>;
}

/**
 * For mission 135 (HIGH/LOW poly and visual cost): each is given the
 * built object, in metres, before its views are drawn.
 */
export const CAD_VIEW_MEASURES: ((
  object: Object3D,
  adapter: MagicAdapter,
) => void)[] = [];

// The cache: every access guarded; without IndexedDB, views are drawn every visit.
let opening: Promise<IDBDatabase | null> | null = null;
function open(): Promise<IDBDatabase | null> {
  opening ??= new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () =>
        r.result.createObjectStore(STORE, { keyPath: 'id' });
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => resolve(null);
      r.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return opening;
}
async function cached(id: string): Promise<CadSheet | null> {
  try {
    const db = await open();
    if (!db) return null;
    const r = db.transaction(STORE).objectStore(STORE).get(id);
    return await new Promise((resolve) => {
      r.onsuccess = () => resolve((r.result as CadSheet) ?? null);
      r.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}
async function keep(sheet: CadSheet) {
  try {
    const db = await open();
    db?.transaction(STORE, 'readwrite').objectStore(STORE).put(sheet);
  } catch {
    // A full or blocked store: drawn again next time.
  }
}

/** The builder's identity: a fingerprint of everything it built that a view could show. */
function builtFingerprint(object: Object3D): string {
  const parts: (string | number)[] = [];
  // Local positions to the millimetre and scales, not rotations: a part
  // that moves with the clock (a gauge's needle) must not change the key,
  // while a part moved, resized, reshaped or recoloured by its builder does.
  const mm = (v: number) => Math.round(v * 1000);
  object.traverse((o) => {
    parts.push(o.type, o.name, o.visible ? 1 : 0);
    parts.push(mm(o.position.x), mm(o.position.y), mm(o.position.z));
    parts.push(mm(o.scale.x), mm(o.scale.y), mm(o.scale.z));
    const mesh = o as Mesh;
    const position = mesh.geometry?.getAttribute?.('position');
    if (position) {
      let sum = 0;
      const a = position.array;
      for (let i = 0; i < a.length; i += 7) sum += a[i];
      parts.push(position.count, sum);
    }
    const materials = ([] as (Material | undefined)[]).concat(mesh.material);
    for (const m of materials) {
      if (!m) continue;
      const c = (m as Material & { color?: { getHex(): number } }).color;
      parts.push(m.type, c ? c.getHex() : -1);
      const map = (m as Material & { map?: Texture | null }).map;
      const image = map?.image as { width?: number; height?: number } | null;
      if (image) parts.push(image.width ?? 0, image.height ?? 0);
    }
  });
  return fingerprint(parts);
}

/** The item as its adapter builds it, at its representative state, in metres. */
function buildItem(adapter: MagicAdapter) {
  const kit = createPanelKit();
  const item = adapter.build(kit);
  if (adapter.looks[0]) item.setLook?.(adapter.looks[0].id);
  if (adapter.pages[0]) item.setPage?.(adapter.pages[0].id);
  item.update?.(0);
  const holder = new Group();
  holder.add(item.object);
  return {
    holder,
    dispose() {
      item.parts?.dispose();
      item.dispose?.();
      disposeKit(kit, holder);
    },
  };
}

const boundsOf = (o: Object3D): Bounds => {
  const b = new Box3().setFromObject(o);
  return {
    min: { x: b.min.x, y: b.min.y, z: b.min.z },
    max: { x: b.max.x, y: b.max.y, z: b.max.z },
  };
};

/**
 * A kind's four views, from the cache when drawn under the same key, else
 * drawn now (and kept). `variant` names a version of the item (135's
 * HIGH or LOW) and takes part in the key.
 */
export async function renderCadViews(
  adapter: MagicAdapter,
  { variant = 'default' }: { variant?: string } = {},
): Promise<CadSheet & { fromCache: boolean }> {
  const { holder, dispose } = buildItem(adapter);
  try {
    const id = cadEntryId(adapter.kind, variant);
    const key = cadCacheKey({
      kind: adapter.kind,
      variant,
      version: String(import.meta.env.VITE_VERSION ?? ''),
      build: String(import.meta.env.VITE_BUILD ?? ''),
      builder: `${adapter.source}:${builtFingerprint(holder)}`,
    });
    const held = await cached(id);
    if (held && isFresh(held, key)) return { ...held, fromCache: true };
    for (const measure of CAD_VIEW_MEASURES) measure(holder, adapter);
    const sheet = draw(holder, id, key);
    await keep(sheet);
    return { ...sheet, fromCache: false };
  } finally {
    dispose();
  }
}

function draw(holder: Group, id: string, key: string): CadSheet {
  const bounds = boundsOf(holder);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = PIXELS;
  const renderer = createRenderer(canvas, false);
  renderer.setPixelRatio(1);
  renderer.setSize(PIXELS, PIXELS, false);
  renderer.setClearColor(CAD_GRID.ground);
  const scene = new Scene();
  const free = useEnvironment(renderer, scene, 0.4);
  // The scene is in game units; the item and its maths in metres.
  const world = new Group();
  world.scale.setScalar(METRE);
  world.add(holder);
  scene.add(world, ...cadLights(METRE));
  const was = ps1Uniforms.resolution.value.clone();
  ps1Uniforms.resolution.value.set(PIXELS, PIXELS);
  const at = (v: readonly number[]) =>
    new Vector3(v[0], v[1], v[2]).multiplyScalar(METRE);
  const images = {} as Record<CadViewName, string>;
  for (const view of CAD_VIEWS) {
    let camera: OrthographicCamera | PerspectiveCamera;
    if (view.from) {
      const f = orthoFrame(bounds, view, PIXELS);
      const h = f.half * METRE;
      camera = new OrthographicCamera(
        -h,
        h,
        h,
        -h,
        f.near * METRE,
        f.far * METRE,
      );
      camera.up.set(f.up[0], f.up[1], f.up[2]);
      camera.position.copy(at(f.position));
      camera.lookAt(at(f.target));
    } else {
      const p = perspectivePose(bounds, FOV);
      camera = new PerspectiveCamera(FOV, 1, p.near * METRE, p.far * METRE);
      camera.position.copy(at(p.position));
      camera.lookAt(at(p.target));
    }
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    images[view.name] = canvas.toDataURL('image/png');
  }
  ps1Uniforms.resolution.value.copy(was);
  world.remove(holder);
  free();
  renderer.dispose();
  renderer.forceContextLoss();
  return {
    id,
    key,
    dims: dimensionsMm(bounds),
    pixelsPerMetre: sheetScale(bounds, PIXELS),
    images,
  };
}

const STYLE = `
.cad { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; max-width: 1000px; }
.cad figure { margin: 0; position: relative; background: ${CAD_GRID.ground}; border: 1px solid #6c7378; aspect-ratio: 1; color: #23272b; font: 12px sans-serif; }
.cad img { width: 100%; height: 100%; display: block; }
.cad .label { position: absolute; left: 6px; top: 4px; font-weight: bold; letter-spacing: 0.08em; }
.cad .dims { position: absolute; right: 6px; top: 4px; }
.cad .bar { position: absolute; left: 6px; bottom: 6px; white-space: nowrap; }
.cad .bar i { display: block; height: 4px; border: 1px solid #23272b; border-top: 0; margin-bottom: 2px; }
.cad .wait { position: absolute; inset: 0; display: grid; place-items: center; color: #5a6066; }
`;

/** The section: four framed views, filled from the cache or once drawn. */
function cadSection(adapter: MagicAdapter | undefined, kind: string) {
  const section = document.createElement('section');
  section.dataset.auditPlace = 'top';
  const h = document.createElement('h2');
  h.textContent = 'CAD views';
  const style = document.createElement('style');
  style.textContent = STYLE;
  section.append(style, h);
  if (!adapter) {
    const note = document.createElement('p');
    note.className = 'note';
    note.textContent =
      'No 3D form the magic room can build: its magic page instead (mission 133).';
    const frame = document.createElement('iframe');
    frame.src = magicPageLink(kind);
    frame.title = `Magic page · ${kind}`;
    Object.assign(frame.style, {
      width: '100%',
      maxWidth: '1000px',
      height: '420px',
      border: '1px solid #6c7378',
      background: '#fff',
    });
    section.append(note, frame);
    return section;
  }
  const note = document.createElement('p');
  note.className = 'note';
  note.textContent = 'Drawing its views (first visit since it changed)…';
  const grid = document.createElement('div');
  grid.className = 'cad';
  const figures = new Map<CadViewName, HTMLElement>();
  for (const v of CAD_VIEWS) {
    const f = document.createElement('figure');
    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = v.label;
    const wait = document.createElement('span');
    wait.className = 'wait';
    wait.textContent = 'drawing…';
    f.append(wait, label);
    grid.append(f);
    figures.set(v.name, f);
  }
  section.append(note, grid);
  const state = { kind, done: false, fromCache: false, key: '' };
  (window as unknown as { __cadViews: unknown }).__cadViews = state;
  // After the page has painted its frames: drawing takes a moment.
  setTimeout(() => {
    void renderCadViews(adapter)
      .then((sheet) => {
        for (const v of CAD_VIEWS) {
          const f = figures.get(v.name)!;
          const img = document.createElement('img');
          img.src = sheet.images[v.name];
          img.alt = `${adapter.title}, ${v.label.toLowerCase()} view`;
          f.querySelector('.wait')?.replaceWith(img);
          const d = viewDimensions(v.name, sheet.dims);
          if (!d) continue;
          const dims = document.createElement('span');
          dims.className = 'dims';
          dims.textContent = d.words;
          const bar = scaleBar(sheet.pixelsPerMetre, PIXELS * 0.3);
          const b = document.createElement('span');
          b.className = 'bar';
          const tick = document.createElement('i');
          // The bar's length as a share of the frame, which the image fills.
          b.style.width = `${(bar.pixels / PIXELS) * 100}%`;
          b.append(tick, bar.label);
          f.append(dims, b);
        }
        note.textContent = `${sheet.dims.w} × ${sheet.dims.d} × ${sheet.dims.h} mm (W × D × H); the flat views share one scale. ${sheet.fromCache ? 'From the browser’s cache: drawn under this build and builder.' : 'Drawn now and cached in this browser.'} Representative state: ${adapter.looks[0]?.words ?? 'as built'}.`;
        Object.assign(state, {
          done: true,
          fromCache: sheet.fromCache,
          key: sheet.key,
        });
      })
      .catch((e: unknown) => {
        note.textContent = `Its views could not be drawn: ${String(e)}`;
      });
  }, 0);
  return section;
}

ITEM_AUDIT_SECTIONS.push((ctx) => cadSection(ctx.adapter, ctx.kind.key));
