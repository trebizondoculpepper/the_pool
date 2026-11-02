import {
  AmbientLight,
  BufferGeometry,
  CanvasTexture,
  DirectionalLight,
  Group,
  HemisphereLight,
  Line,
  LineBasicMaterial,
  LinearMipmapLinearFilter,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  Scene,
  Sprite,
  SpriteMaterial,
  Vector2,
  Vector3,
} from 'three';
import type { Camera, Object3D, WebGLRenderer } from 'three';
import { CAD_GRID, gridLinePixels, gridOffset } from '../logic/cad-views';
import type { GridStyle } from '../logic/cad-views';

/**
 * The CAD drawing sheet's look (the owner, 2026-11-02), shared by the
 * magic room (130) and the item audit's CAD views (133): a grid texture of
 * 1 m major squares and 10 cm minor lines, drawn once and repeated,
 * aligned to world metres so it measures the item; flat, shadowless
 * lighting; and a small X/Y/Z axis triad fixed in a screen corner that
 * turns with the camera. Everything here is drawn in metres: callers
 * scale it by `METRE` as they do the rest of a room.
 */

const textures = new Map<GridStyle, CanvasTexture>();

/**
 * One metre-square tile of a grid style, drawn once and shared (never
 * dispose it): ruled at every level of `style.levels`, finest first, each
 * level's line straddling its own pitch so tiles join seamlessly.
 */
export function cadGridTexture(
  renderer?: WebGLRenderer,
  style: GridStyle = CAD_GRID,
): CanvasTexture {
  let texture = textures.get(style);
  if (!texture) {
    const px = style.pixelsPerMetre;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = px;
    const c = canvas.getContext('2d')!;
    c.fillStyle = style.ground;
    c.fillRect(0, 0, px, px);
    for (const level of style.levels) {
      c.fillStyle = level.colour;
      const half = level.pixels / 2;
      for (const at of gridLinePixels(px, level.perMetre)) {
        c.fillRect(at - half, 0, level.pixels, px);
        c.fillRect(0, at - half, px, level.pixels);
        // The tile's edge line is drawn half on each side, so it shows whole when tiled.
        if (at === 0) {
          c.fillRect(px - half, 0, half, px);
          c.fillRect(0, px - half, px, half);
        }
      }
    }
    texture = new CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.colorSpace = SRGBColorSpace;
    texture.minFilter = LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    textures.set(style, texture);
  }
  if (renderer) texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

/**
 * A gridded rectangle, `w` × `h` metres, in its own x-y plane facing +z,
 * centred at (`cx`, `cy`) of the world axes its tile lines follow: its
 * grid lines fall on whole world metres along both of them.
 */
export function cadGridPlane(
  w: number,
  h: number,
  cx: number,
  cy: number,
  renderer?: WebGLRenderer,
  style: GridStyle = CAD_GRID,
): Mesh {
  const map = cadGridTexture(renderer, style).clone();
  map.needsUpdate = true;
  map.repeat.set(w, h);
  map.offset.set(gridOffset(cx - w / 2), gridOffset(cy - h / 2));
  // Unlit: the sheet reads the same everywhere, with no falloff.
  const material = new MeshBasicMaterial({ map, toneMapped: false });
  const mesh = new Mesh(new PlaneGeometry(w, h), material);
  mesh.name = 'CAD grid';
  return mesh;
}

/** Free a grid plane's own geometry, material and texture clone. */
export function disposeCadGridPlane(mesh: Mesh) {
  mesh.geometry.dispose();
  const m = mesh.material as MeshBasicMaterial;
  m.map?.dispose();
  m.dispose();
}

/** Flat CAD lighting: strong, even ambient and sky light, a weak key for form, no shadows. */
export function cadLights(metre = 1): Object3D[] {
  const key = new DirectionalLight('#ffffff', 0.35);
  key.position.set(-3 * metre, 8 * metre, 6 * metre);
  key.castShadow = false;
  return [
    new AmbientLight('#ffffff', 1.5),
    new HemisphereLight('#ffffff', '#c8c8c8', 0.9),
    key,
  ];
}

const AXES = [
  { label: 'X', colour: '#d23a2e', dir: new Vector3(1, 0, 0) },
  { label: 'Y', colour: '#2f9a3a', dir: new Vector3(0, 1, 0) },
  { label: 'Z', colour: '#2f5fd2', dir: new Vector3(0, 0, 1) },
] as const;

function letter(text: string, colour: string) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const c = canvas.getContext('2d')!;
  c.fillStyle = colour;
  c.font = 'bold 48px sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(text, 32, 34);
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  const sprite = new Sprite(
    new SpriteMaterial({ map, depthTest: false, toneMapped: false }),
  );
  sprite.scale.setScalar(0.45);
  return sprite;
}

/** Red X, green Y, blue Z arrows of `length` from the origin, labelled when `labels`. */
export function axisLines(length: number, labels = false): Group {
  const g = new Group();
  g.name = 'Axes';
  for (const a of AXES) {
    const line = new Line(
      new BufferGeometry().setFromPoints([
        new Vector3(),
        a.dir.clone().multiplyScalar(length),
      ]),
      new LineBasicMaterial({ color: a.colour, toneMapped: false }),
    );
    line.name = `${a.label} axis`;
    g.add(line);
    if (labels) {
      const s = letter(a.label, a.colour);
      s.position.copy(a.dir).multiplyScalar(length * 1.3);
      g.add(s);
    }
  }
  return g;
}

/**
 * The axis triad in a screen corner, turning with `camera` as a CAD
 * view's does. Call `render` after the main render each frame; it draws
 * into a small square at the bottom left and leaves the viewport as it
 * was. A tooltip on `host`'s corner gives the game's convention.
 */
export function createAxisTriad(host: HTMLElement, size = 110) {
  const scene = new Scene();
  const triad = axisLines(1, true);
  scene.add(triad);
  const camera = new OrthographicCamera(-1.8, 1.8, 1.8, -1.8, 0.1, 10);
  camera.position.set(0, 0, 5);
  const note = document.createElement('div');
  note.title =
    'Game axes: x east, y up, z south (−z is north; yaw 0 looks north)';
  note.textContent = 'y up · −z north';
  Object.assign(note.style, {
    position: 'absolute',
    left: '8px',
    bottom: '4px',
    width: `${size}px`,
    textAlign: 'center',
    font: '11px sans-serif',
    color: '#30343a',
    zIndex: '4',
    cursor: 'help',
  });
  host.append(note);
  const full = new Vector2();
  return {
    render(renderer: WebGLRenderer, view: Camera) {
      // The triad shows the world as the view sees it: the camera's turn, undone.
      triad.quaternion.copy(view.getWorldQuaternion(triad.quaternion)).invert();
      const was = renderer.autoClear;
      renderer.autoClear = false;
      renderer.clearDepth();
      renderer.setScissorTest(true);
      const s = size;
      renderer.setScissor(8, 16, s, s);
      renderer.setViewport(8, 16, s, s);
      renderer.render(scene, camera);
      renderer.setScissorTest(false);
      renderer.getSize(full);
      renderer.setViewport(0, 0, full.x, full.y);
      renderer.autoClear = was;
    },
    dispose() {
      note.remove();
      triad.traverse((o) => {
        const m = o as Mesh;
        m.geometry?.dispose();
        const mat = m.material as MeshBasicMaterial | undefined;
        mat?.map?.dispose();
        mat?.dispose();
      });
    },
  };
}
