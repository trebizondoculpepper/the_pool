import {
  Group,
  Mesh,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
} from 'three';
import type { Object3D } from 'three';
import { METRE } from '../../components/core/logic/units';
import {
  createPanelKit,
  disposeKit,
} from '../../components/core/views/eighties-controls';
import { SANS, tools } from '../../components/core/views/fitting-tools';
import { panelMakerMark } from '../../components/core/views/panel-maker-mark';
import { markComponent } from '../../components/core/views/component-identity';
import { createPartSet, selector } from '../../components/core/parts/parts';
import { partAudio } from '../../components/core/audio/part-audio';
import {
  createPs1Material,
  ps1Uniforms,
} from '../../components/core/parts/ps1-material';
import {
  createRenderer,
  layoutSize,
  useEnvironment,
} from '../../components/core/parts/render-style';
import { createFirstPerson } from '../../controls/input/first-person';
import { useOnHit } from '../../controls/input/touch-point';
import type { Footprint } from '../../controls/logic/walk-collision';
import { WALL_THICKNESS, devWalls } from '../logic/dev-room-links';
import { choiceAt, itemAuditLink, panelChoices } from '../logic/item-audit';
import { magicRoomLayout } from '../logic/magic-room-layout';
import { GRAPH_PAPER } from '../logic/cad-views';
import {
  axisLines,
  cadGridPlane,
  cadLights,
  createAxisTriad,
  disposeCadGridPlane,
} from './cad-sheet';
import { adapterFor } from './magic-adapters';
import type { MagicChoice } from './magic-adapters';
import {
  BUDGET_WORDS,
  POLY_VARIANTS,
  VARIANT_LABEL,
  budgetStatus,
  costReadout,
  costSummary,
} from '../logic/visual-cost';
import type { CostRecord, PolyVariant, VisualCost } from '../logic/visual-cost';
import {
  keepMeasurement,
  lowVersionOf,
  measureVisualCost,
} from './visual-cost';

/**
 * The magic room (mission 130, `bench.html?bench=magic-room&kind=<kind>`):
 * a room generated round one item, its floor, walls and ceiling ruled as
 * a CAD sheet (1 m squares, 10 cm subdivisions, on whole world metres) and
 * a wall item's stub as centimetre graph paper, under flat shadowless light
 * with an X/Y/Z triad in the corner, (`logic/magic-room-layout.ts`),
 * built by the game's own view builder through its adapter, with a
 * signpost carrying a small Penfold panel whose LOOK and PAGE selectors
 * step it through its curated looks and display pages. Not a room of the
 * building: `main.ts` never opens it, so it is never in the saved
 * position, and nothing here opens a world store, so it never touches the
 * save. All input goes through the one control scheme (`createFirstPerson`).
 *
 * Its purpose (the owner, 2026-11-03): to prototype the *visual appearance*
 * of a single object — the cheap surface for seeing a component's design.
 * Every real component with a standalone 3D form is registered in `MODELS`
 * (`room-equipment.ts`) and reaches its magic room automatically through
 * `adapterFor`/`fromModel`; the weather station alone keeps a curated
 * adapter for its LOOK/PAGE selectors. Dev rooms, by contrast, are
 * interactive integration tests of features — several machines working
 * together — which a single-object magic room cannot show.
 */

const GREY = { wall: '#9a9d9f', floor: '#7d8082', ceiling: '#b4b6b7' };

export function runMagicRoom(root: HTMLElement) {
  const kind = new URLSearchParams(location.search).get('kind') ?? '';
  const adapter = adapterFor(kind);
  document.title = `Magic room · ${kind}`;
  document.body.style.margin = '0';
  root.replaceChildren();
  Object.assign(root.style, {
    position: 'fixed',
    inset: '0',
    overflow: 'hidden',
  });
  const bar = document.createElement('div');
  Object.assign(bar.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    right: '0',
    zIndex: '5',
    padding: '6px 12px',
    background: 'rgba(20,22,25,0.8)',
    font: '13px sans-serif',
    color: '#e9e1c8',
  });
  const link = (href: string, text: string) => {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = text;
    a.style.color = '#9fc6ff';
    return a;
  };
  const shown = document.createElement('span');
  bar.append(
    link(itemAuditLink(kind).replace(/^bench\.html/, ''), 'Item audit'),
    ' · ',
    link('./?dev', 'Catalogue'),
    ' · ',
    shown,
  );
  root.append(bar);
  if (!adapter) {
    shown.textContent = `No magic room for '${kind}': it has no 3D form the magic room can build. See its item audit.`;
    return;
  }

  const m = METRE;
  const looks = panelChoices(adapter.looks);
  const pages = panelChoices(adapter.pages);
  // Every magic room has its panel: its HIGH · LOW selector at least (mission 135).
  const layout = magicRoomLayout(adapter.size, { panel: true });
  const { halfX, halfZ, height } = layout;

  const canvas = document.createElement('canvas');
  Object.assign(canvas.style, {
    display: 'block',
    width: '100%',
    height: '100%',
  });
  root.append(canvas);
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  const freeEnvironment = useEnvironment(renderer, scene, 0.4);
  renderer.setClearColor('#2a2c2e');
  const camera = new PerspectiveCamera(60, 1, 0.05, 80 * m);
  // Flat CAD light: even, shadowless, no falloff.
  scene.add(...cadLights(m));

  const kit = createPanelKit();
  const t = tools(kit);
  const room = new Group();
  room.scale.setScalar(m);
  scene.add(room);
  const paint = (c: string) => {
    const p = createPs1Material({ color: c, roughness: 0.9 });
    kit.materials.push(p);
    return p;
  };
  const wall = paint(GREY.wall);
  t.box(room, paint(GREY.floor), 2 * halfX, 0.1, 2 * halfZ, 0, -0.05, 0);
  t.box(
    room,
    paint(GREY.ceiling),
    2 * halfX,
    0.1,
    2 * halfZ,
    0,
    height + 0.05,
    0,
  );
  const bounds: Footprint = {
    minX: -halfX * m,
    maxX: halfX * m,
    minZ: -halfZ * m,
    maxZ: halfZ * m,
  };
  const walls = devWalls(bounds, m, height * m);
  for (const w of walls)
    t.box(
      room,
      wall,
      (w.maxX - w.minX) / m,
      (w.top - w.bottom) / m,
      (w.maxZ - w.minZ) / m,
      (w.minX + w.maxX) / 2 / m,
      (w.bottom + w.top) / 2 / m,
      (w.minZ + w.maxZ) / 2 / m,
    );

  // The CAD sheet: grid planes just inside the floor, ceiling and walls, on whole world metres.
  const sheets: Mesh[] = [];
  const sheet = (
    w: number,
    h: number,
    cx: number,
    cy: number,
    place: (p: Mesh) => void,
    style = undefined as typeof GRAPH_PAPER | undefined,
  ) => {
    const p = cadGridPlane(w, h, cx, cy, renderer, style);
    place(p);
    room.add(p);
    sheets.push(p);
  };
  const W = 2 * halfX;
  const D = 2 * halfZ;
  const e = 0.003;
  // The walls straddle the room's bounds: their inner faces stand half a wall in.
  const inset = WALL_THICKNESS / 2 + e;
  sheet(W, D, 0, 0, (p) => {
    p.rotation.x = -Math.PI / 2;
    p.position.y = e;
  });
  sheet(W, D, 0, 0, (p) => {
    p.rotation.x = Math.PI / 2;
    p.position.y = height - e;
  });
  sheet(W, height, 0, height / 2, (p) =>
    p.position.set(0, height / 2, -halfZ + inset),
  );
  sheet(W, height, 0, height / 2, (p) => {
    p.rotation.y = Math.PI;
    p.position.set(0, height / 2, halfZ - inset);
  });
  sheet(D, height, 0, height / 2, (p) => {
    p.rotation.y = Math.PI / 2;
    p.position.set(-halfX + inset, height / 2, 0);
  });
  sheet(D, height, 0, height / 2, (p) => {
    p.rotation.y = -Math.PI / 2;
    p.position.set(halfX - inset, height / 2, 0);
  });
  // Its origin, on the floor at the room's centre.
  const origin = axisLines(0.4);
  origin.position.y = 2 * e;
  room.add(origin);

  // Its title card on the north wall, behind the item.
  const card = t.printed(
    3.6,
    1.2,
    (c, w, h) => {
      c.fillStyle = '#3a3d40';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = '#e8e8e2';
      c.lineWidth = h * 0.02;
      c.strokeRect(h * 0.05, h * 0.05, w - h * 0.1, h - h * 0.1);
      c.fillStyle = '#f4f4ef';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `bold ${h * 0.17}px ${SANS}`;
      c.fillText(adapter.title.toUpperCase(), w / 2, h * 0.4, w * 0.9);
      c.font = `${h * 0.075}px ${SANS}`;
      c.fillStyle = '#d6d8da';
      c.fillText(
        `Magic room: ${kind}, a development room for this item alone (mission 130)`,
        w / 2,
        h * 0.68,
        w * 0.9,
      );
    },
    1024,
  );
  const cardScale = Math.min(1, (2 * halfX - 0.6) / 3.6);
  card.mesh.scale.setScalar(cardScale);
  card.mesh.position.set(
    0,
    Math.min(
      height - 0.4 - 0.6 * cardScale,
      Math.max(2.4, adapter.size.h + 0.9),
    ),
    -halfZ + 0.17,
  );
  room.add(card.mesh);

  // The item, by its own builder, free in the middle, facing the way in.
  const item = adapter.build(kit);
  const holder = new Group();
  holder.name = `Magic room item: ${adapter.title}`;
  holder.position.set(layout.item.x, layout.item.y, layout.item.z);
  holder.add(item.object);
  // Its LOW version beside it, hidden until chosen (mission 135).
  const low = lowVersionOf(adapter, kit, item);
  low.object.visible = false;
  holder.add(low.object);
  markComponent(holder, { name: adapter.title });
  room.add(holder);
  if (layout.stub) {
    const s = layout.stub;
    t.box(
      room,
      wall,
      s.maxX - s.minX,
      s.height,
      s.maxZ - s.minZ,
      (s.minX + s.maxX) / 2,
      s.height / 2,
      (s.minZ + s.maxZ) / 2,
    );
    // The face the item hangs on is centimetre graph paper, to read its size off.
    const sw = s.maxX - s.minX;
    const cx = (s.minX + s.maxX) / 2;
    sheet(
      sw,
      s.height,
      cx,
      s.height / 2,
      (p) => p.position.set(cx, s.height / 2, s.maxZ + e),
      GRAPH_PAPER,
    );
  }

  // The signpost and its Penfold panel: LOOK and PAGE selectors.
  const controls = createPartSet();
  let look = 0;
  let page = 0;
  let poly = 0;
  const costs: Partial<Record<PolyVariant, VisualCost>> = {};
  let measuring = true;
  let readout: ReturnType<typeof t.printed> | null = null;
  let readoutLines = ['', ''];
  const variant = () => POLY_VARIANTS[poly] ?? 'high';
  const say = () => {
    const l = choiceAt(looks, look);
    const p = choiceAt(pages, page);
    const v = variant();
    const c = costs[v];
    const cost = c
      ? `${VARIANT_LABEL[v]}: ${costSummary(c)} · ${BUDGET_WORDS[budgetStatus(c, [adapter.kind, `kind:${adapter.kind}`]).state]}`
      : `${VARIANT_LABEL[v]}: measuring…`;
    shown.textContent = `${adapter.title} · ${[l?.words, p?.words].filter(Boolean).join(' · ') || 'no looks curated yet'} · ${cost}`;
    readoutLines = costReadout(v, c);
    if (readout) {
      drawReadout(
        readout.context,
        readout.context.canvas.width,
        readout.context.canvas.height,
      );
      readout.texture.needsUpdate = true;
    }
  };
  const drawReadout = (c: CanvasRenderingContext2D, w: number, h: number) => {
    c.fillStyle = '#10140f';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#9dff8a';
    c.font = `${h * 0.36}px monospace`;
    c.textBaseline = 'middle';
    c.fillText(readoutLines[0], w * 0.03, h * 0.28, w * 0.94);
    c.fillText(readoutLines[1], w * 0.03, h * 0.74, w * 0.94);
  };
  const apply = () => {
    const l = choiceAt(looks, look);
    const p = choiceAt(pages, page);
    if (l) item.setLook?.(l.id);
    if (p) item.setPage?.(p.id);
    const high = variant() === 'high';
    item.object.visible = high;
    low.object.visible = !high;
    say();
  };
  let panelGroup: Group | null = null;
  if (layout.signpost) {
    const post = new Group();
    post.position.set(layout.signpost.x, 0, layout.signpost.z);
    t.box(post, paint('#4b4f53'), 0.06, 1.25, 0.06, 0, 0.625, 0);
    t.box(post, paint('#3b3e41'), 0.3, 0.03, 0.2, 0, 0.015, 0);
    const W = 0.5;
    const H = 0.4;
    const face = new Group();
    face.position.set(0, 1.4, 0.04);
    // Tipped back a little, to read from standing.
    face.rotation.x = -0.25;
    t.box(face, paint('#c9c4b5'), W, H, 0.03, 0, 0, -0.015);
    panelMakerMark(kit, face, { width: W, height: H, z: 0.001 });
    t.label(face, 'MAGIC PANEL', -0.06, H / 2 - 0.03, 0.002, 0.016, '#1b1b1b');
    const knob = (
      list: readonly MagicChoice[],
      legend: string,
      x: number,
      get: () => number,
      set: (k: number) => void,
    ) => {
      if (!list.length) return;
      const part = controls.add(
        selector(kit, {
          positions: list.length as 2 | 3 | 4,
          legend,
          name: `Magic panel ${legend} selector`,
          bound: {
            get value() {
              return get();
            },
            set: (k: number) => {
              set(k);
              apply();
            },
          },
        }),
      );
      part.object.position.set(x, 0.03, 0.004);
      face.add(part.object);
      list.forEach((c, i) =>
        t.label(
          face,
          `${i + 1} ${c.label}`,
          x,
          -0.03 - i * 0.022,
          0.002,
          0.012,
          '#1b1b1b',
        ),
      );
    };
    knob(
      looks,
      'LOOK',
      -0.16,
      () => look,
      (k) => (look = k),
    );
    knob(
      pages,
      'PAGE',
      0,
      () => page,
      (k) => (page = k),
    );
    // HIGH · LOW: the item's full version or its low-poly one (mission 135).
    knob(
      POLY_VARIANTS.map((v) => ({
        id: v,
        label: VARIANT_LABEL[v],
        words: `${VARIANT_LABEL[v]} poly version`,
      })),
      'POLY',
      0.16,
      () => poly,
      (k) => (poly = k),
    );
    // Beside it, the shown version's visual cost: a small green readout.
    readout = t.printed(W - 0.04, 0.05, drawReadout, 512, true);
    readout.mesh.position.set(0, -H / 2 + 0.04, 0.002);
    face.add(readout.mesh);
    post.add(face);
    room.add(post);
    panelGroup = post;
  }
  apply();

  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const useAt = (x: number, y: number) => {
    raycaster.setFromCamera(pointer.set(x, y), camera);
    const targets: Object3D[] = [
      item.object,
      ...(panelGroup ? [panelGroup] : []),
    ];
    const hit = raycaster.intersectObjects(targets, true)[0];
    if (!hit || hit.distance > 4 * m) return null;
    for (let o: Object3D | null = hit.object; o; o = o.parent)
      for (const set of [controls, item.parts]) {
        const work = set?.uses.get(o);
        if (work) return useOnHit(hit, o, work, camera);
      }
    return null;
  };
  const solids: Footprint[] = [
    ...walls,
    ...layout.solids.map((s) => ({
      minX: s.minX * m,
      maxX: s.maxX * m,
      minZ: s.minZ * m,
      maxZ: s.maxZ * m,
    })),
  ];
  const walk = createFirstPerson({
    scene,
    canvas,
    camera,
    metre: m,
    floorY: 0,
    start: {
      x: layout.start.x * m,
      z: layout.start.z * m,
      yaw: layout.start.yaw,
    },
    flightBounds: () => ({
      minX: (-halfX + 0.05) * m,
      maxX: (halfX - 0.05) * m,
      minZ: (-halfZ + 0.05) * m,
      maxZ: (halfZ - 0.05) * m,
      minY: 0.05 * m,
      maxY: (height - 0.05) * m,
    }),
    solids: () => solids,
    use: (x, y) => useAt(x, y)?.(),
    aimed: () => Boolean(useAt(0, 0)),
  });
  walk.place(layout.start.x * m, layout.start.z * m, layout.start.yaw, 0);

  // For pictures and tests: stand anywhere (metres, degrees), set a look or page.
  (window as unknown as { magicRoom: unknown }).magicRoom = {
    kind,
    layout,
    looks: looks.map((l) => l.id),
    pages: pages.map((p) => p.id),
    place(x: number, z: number, yaw = 0, pitch = 0) {
      walk.place(x * m, z * m, (yaw * Math.PI) / 180, (pitch * Math.PI) / 180);
    },
    look(i: number) {
      look = i;
      apply();
    },
    page(i: number) {
      page = i;
      apply();
    },
    /** 0 HIGH, 1 LOW. */
    poly(i: number) {
      poly = i;
      apply();
    },
    get variant() {
      return variant();
    },
    get measuring() {
      return measuring;
    },
    costs,
    /** The item's two versions, for scripts. */
    versions: { high: item.object, low: low.object },
    use: (x = 0, y = 0) => useAt(x, y)?.(),
  };

  const resize = () => {
    const { width, height: h } = layoutSize(canvas);
    if (!width || !h) return;
    renderer.setSize(Math.round(width), Math.round(h), false);
    ps1Uniforms.resolution.value.set(width, h);
    camera.aspect = width / h;
    camera.updateProjectionMatrix();
  };
  const triad = createAxisTriad(root);
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  let last = 0;
  renderer.setAnimationLoop((time) => {
    const delta = last ? Math.min(0.1, (time - last) / 1000) : 0;
    last = time;
    ps1Uniforms.time.value = time / 1000;
    walk.update(delta);
    partAudio.listen(camera, m, scene);
    controls.update(delta);
    // While its cost is measured, the room is not drawn: the measurement
    // has the renderer, and the signs' fades, to itself.
    if (measuring) return;
    item.update?.(delta);
    renderer.render(scene, camera);
    triad.render(renderer, camera);
  });
  // Its visual cost, both versions, measured live as the room opens (the
  // owner, 2026-11-02), kept as its last measurement for the item audit page.
  void (async () => {
    try {
      const high = await measureVisualCost(renderer, item.object, item.update);
      costs.high = high;
      say();
      const lowCost = await measureVisualCost(renderer, low.object, undefined);
      costs.low = lowCost;
      const record: CostRecord = {
        kind,
        measuredAt: Date.now(),
        version:
          `${String(import.meta.env.VITE_VERSION ?? '')} ${String(import.meta.env.VITE_BUILD ?? '')}`.trim(),
        high,
        low: lowCost,
      };
      keepMeasurement(record);
    } catch (error) {
      console.warn('magic room: measuring its visual cost', error);
    } finally {
      measuring = false;
      apply();
    }
  })();
  addEventListener('pagehide', () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    triad.dispose();
    for (const p of sheets) disposeCadGridPlane(p);
    walk.dispose();
    controls.dispose();
    item.parts?.dispose();
    item.dispose?.();
    low.dispose();
    disposeKit(kit, scene as unknown as Group);
    freeEnvironment();
    renderer.dispose();
  });
}
