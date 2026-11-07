import { Box3, InstancedMesh, Mesh, Raycaster, Vector2, Vector3 } from 'three';
import type { BufferGeometry, Camera, Intersection, Object3D } from 'three';
import type { World } from '../../../game/world';
import { inspectComponent } from '../../../game/plant/component-inspection';
import { owningComponent } from '../../components/core/views/component-identity';
import type { ComponentIdentity } from '../../components/core/views/component-identity';
import {
  equipmentKindOf,
  kindOwnerOf,
  BOUND_THING,
} from '../../components/core/views/equipment-kind';
import { EQUIPMENT_KINDS, isKindId } from '../../../game/plant/equipment-kinds';
import { kindFiles } from '../../../game/plant/kind-files';
import { INSPECT_REACH_METRES } from '../../controls/logic/inspection';
import type { InspectionTarget } from '../../controls/logic/inspection';
import { useRoomInspector } from '../../controls/input/room-controller';

/**
 * What the information overlay names at a point of the view (prompt 061):
 * the first surface the aim meets, within reach, blocks what is behind it
 * (a wall, a closed cabinet door); its nearest marked owner up its parents
 * is the component named (`component-identity.ts`), or nothing. Where a
 * thing has no identity but a registered kind (mission 160), it is named
 * by the kind's type, with the binding's thing as its tag when the object
 * carries it. Hidden meshes are passed through, except a deliberate pick
 * mesh (`userData.pick`); lines and points never block. Inspecting only
 * looks.
 */

const shown = (object: Object3D) => {
  if (object.userData.pick) return true;
  for (let o: Object3D | null = object; o; o = o.parent)
    if (!o.visible) return false;
  return true;
};

export interface InspectorOptions {
  /** What to look among: the room's scene or its built rooms. */
  root: Object3D;
  camera: Camera;
  /** Scene units per metre. */
  metre: number;
  /** The world whose live state the second line reads, if any. */
  world?: () => World | undefined;
  /** Another way to know a hit object, for a room whose things are not marked (dev0). */
  identify?: (object: Object3D) => ComponentIdentity | undefined;
}

export function createInspector(options: InspectorOptions) {
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const box = new Box3();
  const at = new Vector3();
  const hits: Intersection[] = [];
  /**
   * The meshes the aim might meet within reach, in the shown part of the
   * scene: a whole room's every mesh tested against the ray costs a frame's
   * time (about 11 ms in the Olympic plant room, most of it the services
   * ceiling's few large merged meshes, far overhead); each mesh's bounding
   * box must be entered within reach first.
   */
  const nearby = (from: Vector3, far: number, out: Mesh[]) => {
    const visit = (o: Object3D) => {
      if (!o.visible && !o.userData.pick) return;
      // Instances stand wherever their matrices put them: always tested.
      if (o instanceof InstancedMesh) out.push(o);
      else if (o instanceof Mesh) {
        const g = o.geometry as BufferGeometry;
        if (!g.boundingBox) g.computeBoundingBox();
        if (g.boundingBox) {
          box.copy(g.boundingBox).applyMatrix4(o.matrixWorld);
          // Entered within reach (or already inside it).
          const entry = box.containsPoint(from)
            ? from
            : raycaster.ray.intersectBox(box, at);
          if (entry && entry.distanceTo(from) <= far) out.push(o);
        }
      }
      for (const child of o.children) visit(child);
    };
    visit(options.root);
    return out;
  };
  // Every mesh's bounds computed ahead, in idle time, so the first look
  // does not stall on them (about 40 ms in the Olympic plant room).
  const warm = () =>
    options.root.traverse((o) => {
      if (o instanceof Mesh && !(o.geometry as BufferGeometry).boundingBox)
        (o.geometry as BufferGeometry).computeBoundingBox();
    });
  if (typeof requestIdleCallback === 'function') requestIdleCallback(warm);
  return (x: number, y: number): InspectionTarget | null => {
    raycaster.setFromCamera(pointer.set(x, y), options.camera);
    raycaster.far = INSPECT_REACH_METRES * options.metre;
    hits.length = 0;
    for (const mesh of nearby(raycaster.ray.origin, raycaster.far, []))
      mesh.raycast(raycaster, hits);
    hits.sort((a, b) => a.distance - b.distance);
    for (const hit of hits) {
      if (!(hit.object instanceof Mesh) || !shown(hit.object)) continue;
      const owner = owningComponent(hit.object);
      // A marked part names itself; else the room's own naming (dev0's
      // controls) wins over a whole board's mark (its look-link name).
      const identity = owner?.identity.part
        ? owner.identity
        : (options.identify?.(hit.object) ?? owner?.identity);
      if (identity) {
        const lines = inspectComponent(identity, options.world?.());
        // A part with nothing more to say: what it is on (prompt 068).
        if (lines && identity.part && !lines.detail && owner?.object.parent) {
          const whole = owningComponent(owner.object.parent)?.identity;
          // The whole's live state too, where it keeps one ("On BH-DP1-IV2
          // (ball valve) - shut", #47).
          const on =
            whole && !whole.part
              ? inspectComponent(whole, options.world?.())
              : null;
          if (on) return { ...lines, detail: `On ${on.title}.` };
        }
        return lines;
      }
      // No identity: a registered kind names the thing (mission 160), by
      // its kind's type, with the binding's thing as its tag when the
      // object carries one. Anything else stays silent and still blocks.
      const kind = equipmentKindOf(hit.object);
      return kind ? kindTarget(kind, hit.object) : null;
    }
    return null;
  };
}

/**
 * What a hit with a registered kind but no identity is called (mission
 * 160): the kind's own name (`type`), the registry's bound thing as its
 * tag where the object carries one (the desk's software boxes are bound
 * by their title's id), the object's own bound tag where a placed item
 * keeps it.
 */
function kindTarget(kind: string, object: Object3D): InspectionTarget | null {
  if (!isKindId(kind)) return null;
  const item = EQUIPMENT_KINDS[kind];
  const tag = boundTag(kind, object);
  return { key: tag ? `thing:${tag}` : `kind:${kind}`, title: item.type };
}

/**
 * The registry's bound things, as a set per kind (mission 160), made the
 * first time a kind is aimed at from the one compiled registry
 * (`kindFiles()`, compiled once when it loads), so a hover is a lookup.
 */
const boundThings = new Map<string, Set<string>>();
function boundThingsOf(kind: string): Set<string> {
  let things = boundThings.get(kind);
  if (!things) {
    things = new Set((kindFiles()[kind]?.bindings ?? []).map((b) => b.thing));
    boundThings.set(kind, things);
  }
  return things;
}

/**
 * The registry's bound thing for `object` of `kind`: the kind-carrying
 * object's own `boundThing` mark where the builder set it (the desk's
 * software boxes are bound by their title's id), when that thing is one
 * of the kind's bindings. Nothing is guessed: a value read only from the
 * marker that set the kind, never from any object's other data.
 */
function boundTag(kind: string, object: Object3D): string | null {
  const owner = kindOwnerOf(object);
  const thing = owner?.userData[BOUND_THING];
  if (typeof thing !== 'string' || !thing) return null;
  return boundThingsOf(kind).has(thing) ? thing : null;
}

/**
 * Register the information overlay for every room (mission 160): the game
 * calls this once (`main.ts`, along with `installRoomObjectTraits`), and every
 * room's controller builds its inspector from its own scene, camera and
 * metre plus the room's `world` and `identify` data. Rooms stop passing
 * `inspect` themselves.
 */
export const installRoomInspector = () =>
  useRoomInspector(({ scene, camera, metre, world, identify }) =>
    createInspector({
      root: scene,
      camera,
      metre,
      world: world as () => World | undefined,
      identify: identify as (object: Object3D) => ComponentIdentity | undefined,
    }),
  );
