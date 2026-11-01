import {
  AmbientLight,
  BoxGeometry,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Raycaster,
  Scene,
  Vector2,
} from 'three';
import type { Object3D } from 'three';
import { partAudio } from '../../components/core/audio/part-audio';
import { devPortals, devWalls } from '../logic/dev-room-links';
import { BRANDS } from '../../components/core/logic/brands';
import {
  BRAND_PANEL,
  STAND_OFF,
  brandsRoomLayout,
} from '../logic/brands-room-layout';
import { METRE } from '../../components/core/logic/units';
import type { Footprint } from '../../controls/logic/walk-collision';
import { createSectionBoard } from '../../components/core/views/signage';
import {
  createMicroLabel,
  createPanelKit,
  disposeKit,
  kitPaint,
} from '../../components/core/views/eighties-controls';
import {
  BRAND_SHEET_ASPECT,
  brandSheetTexture,
} from '../../components/core/views/brand-logo';
import { createPortals } from '../views/portals';
import { createFirstPerson } from '../../controls/input/first-person';
import { ps1Uniforms } from '../../components/core/parts/ps1-material';
import {
  createRenderer,
  useEnvironment,
  layoutSize,
} from '../../components/core/parts/render-style';

const CEILING = 3.6;
// A board for every brand, round the walls and down the middle, the room
// as long as the middle row needs (thirty-four brands, a 30 m room, from
// Veldkamp, 2026-11-01): `brands-room-layout.ts`.
const {
  floor: FLOOR,
  middle: MIDDLE,
  hangs: HANGS,
} = brandsRoomLayout(BRANDS.length);
const PANEL = BRAND_PANEL;

/**
 * Dev8, Brands and Logos: the companies of the world of the VX3 and the
 * Encabulator (`src/toolkit/components/core/logic/brands.ts`), each on a numbered board round the
 * walls: its mark, its wordmark, its tagline, its colours and a few facts,
 * drawn by `src/toolkit/components/core/views/brand-logo.ts`, which also draws the logos to put on
 * things. Nothing here works: it is a room to look round.
 */
export function startBrandsRoom(canvas: HTMLCanvasElement) {
  const m = METRE;
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  const freeEnvironment = useEnvironment(renderer, scene, 0.4);
  renderer.setClearColor('#0b0c0d');
  const camera = new PerspectiveCamera(62, 1, 0.05, 80 * m);
  scene.add(new AmbientLight('#e8e6e0', 0.75));
  scene.add(new HemisphereLight('#f2f1ec', '#3a3a36', 0.8));
  const kit = createPanelKit();
  const room = new Group();
  room.scale.setScalar(m);
  scene.add(room);

  // ---- The room -------------------------------------------------------------
  const W = FLOOR.maxX - FLOOR.minX;
  const D = FLOOR.maxZ - FLOOR.minZ;
  const floor = new Mesh(new PlaneGeometry(W, D), kitPaint(kit, '#5d5f5c'));
  floor.rotation.x = -Math.PI / 2;
  room.add(floor);
  const ceiling = new Mesh(new PlaneGeometry(W, D), kitPaint(kit, '#e6e4de'));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = CEILING;
  room.add(ceiling);
  // A pair of lamps every 8 m or so down the room's length.
  const lampRows = Math.max(3, Math.round(W / 8));
  for (let i = 0; i < lampRows; i++)
    for (const z of [-3.5, 3.5]) {
      const x = FLOOR.minX + ((i + 0.5) * W) / lampRows;
      const lamp = new PointLight('#fff6ea', 10, 11 * m);
      lamp.position.set(x * m, (CEILING - 0.25) * m, z * m);
      scene.add(lamp);
    }
  const bounds: Footprint = {
    minX: FLOOR.minX * m,
    maxX: FLOOR.maxX * m,
    minZ: FLOOR.minZ * m,
    maxZ: FLOOR.maxZ * m,
  };
  const outer = devWalls(bounds, m, CEILING * m);
  const wallPaint = kitPaint(kit, '#efede8');
  for (const piece of outer) {
    const mesh = new Mesh(
      new BoxGeometry(
        piece.maxX - piece.minX,
        piece.top - piece.bottom,
        piece.maxZ - piece.minZ,
      ),
      wallPaint,
    );
    mesh.position.set(
      (piece.minX + piece.maxX) / 2,
      (piece.bottom + piece.top) / 2,
      (piece.minZ + piece.maxZ) / 2,
    );
    scene.add(mesh);
  }
  const sign = createSectionBoard(kit, 'BRANDS AND LOGOS', 4.4);
  sign.position.set(0, 3.0, FLOOR.minZ + 0.154);
  room.add(sign);

  // ---- The exhibits ---------------------------------------------------------
  const backing = kitPaint(kit, '#d8d6cf');
  const sheetMaterials: MeshStandardMaterial[] = [];
  BRANDS.forEach((brand, i) => {
    const hang = HANGS[i];
    if (!hang) return;
    const exhibit = new Group();
    exhibit.name = `Brand: ${brand.name}`;
    // Standing off the wall's face, turned to face into the room.
    exhibit.position.set(
      hang.x + Math.sin(hang.facing) * hang.off,
      0,
      hang.z + Math.cos(hang.facing) * hang.off,
    );
    exhibit.rotation.y = hang.facing;
    room.add(exhibit);
    const panel = new Mesh(new BoxGeometry(PANEL.w, PANEL.h, 0.04), backing);
    panel.position.y = PANEL.y;
    exhibit.add(panel);
    const width = PANEL.w - 0.12;
    const material = new MeshStandardMaterial({
      map: brandSheetTexture(brand),
      roughness: 0.75,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    sheetMaterials.push(material);
    const paint = new Mesh(
      new PlaneGeometry(width, width / BRAND_SHEET_ASPECT),
      material,
    );
    paint.position.set(0, PANEL.y, 0.021);
    exhibit.add(paint);
    // Its number, big, on a black plate at the panel's top left corner,
    // so it can be named from across the room.
    const number = createMicroLabel(kit, String(i + 1), {
      height: 0.16,
      ink: '#f5f5f5',
      plate: '#141414',
    });
    number.position.set(
      -PANEL.w / 2 + 0.12,
      PANEL.y + PANEL.h / 2 - 0.12,
      0.025,
    );
    exhibit.add(number);
    // A freestanding board's two posts, built once with its south face.
    if (hang.off === STAND_OFF && hang.facing === 0)
      for (const side of [-1, 1]) {
        const post = new Mesh(
          new BoxGeometry(0.06, PANEL.y + PANEL.h / 2, 0.12),
          backing,
        );
        post.position.set(
          side * (PANEL.w / 2 + 0.03),
          (PANEL.y + PANEL.h / 2) / 2,
          -STAND_OFF,
        );
        exhibit.add(post);
        const foot = new Mesh(new BoxGeometry(0.1, 0.04, 0.6), backing);
        foot.position.set(side * (PANEL.w / 2 + 0.03), 0.02, -STAND_OFF);
        exhibit.add(foot);
      }
  });
  const stands: Footprint[] = MIDDLE.map((x) => ({
    minX: (x - PANEL.w / 2 - 0.1) * m,
    maxX: (x + PANEL.w / 2 + 0.1) * m,
    minZ: -0.35 * m,
    maxZ: 0.35 * m,
  }));

  // ---- Walking --------------------------------------------------------------
  const portals = createPortals('dev8', devPortals('dev8', bounds, m), 0, m);
  scene.add(portals.group);
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const portalAt = (x: number, y: number) => {
    raycaster.setFromCamera(pointer.set(x, y), camera);
    const hit = raycaster.intersectObject(portals.group, true)[0];
    if (!hit) return null;
    for (let o: Object3D | null = hit.object; o; o = o.parent) {
      const travel = portals.uses.get(o as Mesh);
      if (travel) return travel;
    }
    return null;
  };
  const views: Record<
    string,
    { x: number; z: number; yaw: number; pitch: number }
  > = {
    room: { x: 0, z: 5 * m, yaw: 0, pitch: 0 },
  };
  HANGS.forEach((hang, i) => {
    // 3 m in front of each exhibit, facing it.
    views[String(i + 1)] = {
      x: (hang.x + Math.sin(hang.facing) * 3) * m,
      z: (hang.z + Math.cos(hang.facing) * 3) * m,
      yaw: -hang.facing,
      pitch: 0.02,
    };
  });
  const params = new URLSearchParams(location.search);
  const walk = createFirstPerson({
    scene,
    canvas,
    camera,
    metre: m,
    floorY: 0,
    objects: scene,
    start:
      views[params.get('view') ?? ''] ??
      portals.arrival(params.get('from')) ??
      views.room,
    solids: () => [...outer, ...stands],
    use: (x, y) => portalAt(x, y)?.(),
    aimed: () => Boolean(portalAt(0, 0)),
  });
  const resize = () => {
    const { width, height } = layoutSize(canvas);
    if (!width || !height) return;
    renderer.setSize(Math.round(width), Math.round(height), false);
    ps1Uniforms.resolution.value.set(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  (window as unknown as { devBrands: unknown }).devBrands = {
    view(name: string) {
      const pose = views[name];
      if (pose) walk.place(pose.x, pose.z, pose.yaw, pose.pitch);
    },
    place(x: number, z: number, yaw = 0, pitch = 0) {
      walk.place(x * m, z * m, yaw, pitch);
    },
    brands: () => BRANDS.map((b, i) => `${i + 1}. ${b.name} (${b.mark})`),
    /** Every brand's sheet, numbered, on one sheet over the view. */
    sheet(show = true) {
      document.getElementById('brand-sheet')?.remove();
      if (!show) return;
      const columns = 4;
      const cell = { w: 600, h: 400 };
      const sheet = document.createElement('canvas');
      sheet.id = 'brand-sheet';
      sheet.width = columns * cell.w;
      sheet.height = Math.ceil(BRANDS.length / columns) * cell.h;
      Object.assign(sheet.style, {
        position: 'fixed',
        inset: '0',
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        background: '#d8d6cf',
        zIndex: '10',
      });
      const ctx = sheet.getContext('2d')!;
      BRANDS.forEach((brand, i) => {
        const x = (i % columns) * cell.w;
        const y = Math.floor(i / columns) * cell.h;
        const image = brandSheetTexture(brand).image as HTMLCanvasElement;
        ctx.drawImage(image, x + 6, y + 6, cell.w - 12, cell.h - 12);
        ctx.fillStyle = '#141414';
        ctx.fillRect(x + 6, y + 6, 54, 44);
        ctx.fillStyle = '#f5f5f5';
        ctx.font = 'bold 30px sans-serif';
        ctx.fillText(String(i + 1), x + 14, y + 40);
      });
      document.body.append(sheet);
    },
  };

  // ---- Each frame -------------------------------------------------------------
  let last = 0;
  renderer.setAnimationLoop((time) => {
    if (canvas.parentElement?.hidden) {
      last = 0;
      return;
    }
    const delta = last ? Math.min(0.1, (time - last) / 1000) : 0;
    last = time;
    ps1Uniforms.time.value = time / 1000;
    walk.update(delta);
    portals.update(delta, walk.walker.x, walk.walker.z, !walk.following);
    partAudio.listen(camera, m, scene);
    renderer.render(scene, camera);
  });
  const dispose = () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    walk.dispose();
    portals.dispose();
    for (const material of sheetMaterials) material.dispose();
    disposeKit(kit, scene as unknown as Group);
    freeEnvironment();
    renderer.dispose();
    delete (window as unknown as { devBrands?: unknown }).devBrands;
  };
  return Object.assign(dispose, {
    enter(previous: string | null) {
      const view =
        views[new URLSearchParams(location.search).get('view') ?? ''];
      if (view) {
        walk.place(view.x, view.z, view.yaw, view.pitch);
        return;
      }
      const pose = portals.arrival(previous);
      if (pose) walk.place(pose.x, pose.z, pose.yaw, pose.pitch);
    },
  });
}
