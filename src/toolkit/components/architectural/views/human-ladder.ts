import {
  Box3,
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from 'three';
import type { Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import type { Footprint } from '../../../controls/logic/walk-collision';
import type { LadderZone } from '../../../controls/logic/ladder-zone';
import {
  humanLadderLayout,
  type HumanLadderKind,
  type HumanLadderLayout,
  type LadderPoint,
} from '../logic/human-ladder';
import { createPoolLadder } from '../../../gallery/views/pool-ladder';
import { markNonBody } from '../../core/views/non-body';
import { createTankLadder } from '../../plant/views/tank-ladder';
import { createCagedLadder } from '../../plant/views/railings';
import { createSafetySign } from '../../general-safety/views/safety-signs';
import { plantTools } from '../../plant/views/plant-tools';

interface LadderRecord {
  layout: HumanLadderLayout;
  enabled: () => boolean;
  topEnabled: () => boolean;
  bottomEnabled: () => boolean;
}
const records = new WeakMap<Object3D, LadderRecord>();
const roomCache = new WeakMap<
  Object3D,
  { children: number; ladders: Group[] }
>();

function roomLadders(root: Object3D): Group[] {
  const prior = roomCache.get(root);
  if (prior?.children === root.children.length) return prior.ladders;
  const ladders: Group[] = [];
  root.traverse((object) => {
    if (records.has(object)) ladders.push(object as Group);
  });
  roomCache.set(root, { children: root.children.length, ladders });
  return ladders;
}

const worldPoint = (group: Group, at: LadderPoint) =>
  group.localToWorld(new Vector3(...at));

function zoneOf(group: Group, layout: HumanLadderLayout): LadderZone {
  group.updateWorldMatrix(true, false);
  const rung = worldPoint(group, layout.rung);
  const bottom = worldPoint(group, [
    layout.rung[0],
    layout.bottom,
    layout.rung[2],
  ]);
  const top = worldPoint(group, [layout.rung[0], layout.top, layout.rung[2]]);
  const lower = worldPoint(group, layout.bottomExit);
  const upper = worldPoint(group, layout.topExit);
  return {
    minX: Math.min(rung.x, lower.x, upper.x) - 0.3,
    maxX: Math.max(rung.x, lower.x, upper.x) + 0.3,
    minZ: Math.min(rung.z, lower.z, upper.z) - 0.3,
    maxZ: Math.max(rung.z, lower.z, upper.z) + 0.3,
    bottom: bottom.y,
    top: top.y,
    rung: { x: rung.x, z: rung.z },
    bottomExit: { x: lower.x, z: lower.z },
    topExit: { x: upper.x, z: upper.z },
  };
}

/** One public constructor for ladders made for people rather than cables. */
export function createHumanLadder(
  kind: HumanLadderKind,
  height: number,
  options: {
    kit?: PanelKit;
    width?: number;
    standOff?: number;
    extension?: number;
    topExit?: LadderPoint;
    bottomExit?: LadderPoint;
    enabled?: () => boolean;
    topEnabled?: () => boolean;
    bottomEnabled?: () => boolean;
    /** Build a guarded top landing at the top (a caged ladder on a wall/stair). A tank's ladder wants none — the tank's guarded roof takes its place (mission 151). */
    landing?: boolean;
    /** A tank's ladder: fall and drowning warnings on the tank behind it, hazard marking on the floor round its foot. */
    tankWarnings?: boolean;
  } = {},
) {
  const layout = humanLadderLayout(kind, height, options);
  let group: Group;
  if (kind === 'pool') group = createPoolLadder(height, options.width);
  else {
    if (!options.kit) throw new Error(`${kind} ladder needs a PanelKit.`);
    group =
      kind === 'tank-access'
        ? createTankLadder(options.kit, {
            depth: height,
            standOff: options.standOff,
            extension: options.extension,
          })
        : createCagedLadder(options.kit, height, kind === 'caged');
  }
  if (kind === 'caged' || kind === 'utility') {
    if (options.landing !== false) {
      const metal = new MeshStandardMaterial({
        color: '#565d60',
        metalness: 0.62,
        roughness: 0.45,
      });
      options.kit?.materials.push(metal);
      const side = Math.sign(layout.topExit[2]) || -1;
      const centre = side * 0.54;
      const deck = new Mesh(new BoxGeometry(1.18, 0.06, 0.9), metal);
      deck.name = 'Ladder top service landing';
      deck.position.set(0, layout.top - 0.03, centre);
      group.add(deck);
      for (const x of [-0.57, 0.57]) {
        const rail = new Mesh(new BoxGeometry(0.035, 1.05, 0.9), metal);
        rail.name = 'Ladder landing guard';
        rail.position.set(x, layout.top + 0.525, centre);
        group.add(rail);
      }
      const end = new Mesh(new BoxGeometry(1.18, 1.05, 0.035), metal);
      end.name = 'Ladder landing end guard';
      end.position.set(0, layout.top + 0.525, centre + side * 0.44);
      group.add(end);
    }
  }
  if (options.tankWarnings && options.kit && kind === 'caged')
    addTankLadderWarnings(options.kit, group, layout.bottom, layout.top);
  group.name = `${kind} human access ladder`;
  group.userData.live = true;
  const record = {
    layout,
    enabled: options.enabled ?? (() => true),
    topEnabled: options.topEnabled ?? (() => true),
    bottomEnabled: options.bottomEnabled ?? (() => true),
  };
  records.set(group, record);
  // Not a body: a tank's roof is found under its ladder's cage, never on it (mission 175).
  markNonBody(group);
  return {
    group,
    zone: () => zoneOf(group, layout),
    enabled: () => record.enabled(),
    setEnabled: (enabled: () => boolean) => {
      record.enabled = enabled;
    },
    /** Stile collision only; do not block the rung passage with one wide box. */
    solids: (): Footprint[] => {
      group.updateWorldMatrix(true, false);
      return layout.stiles.map((f) => {
        const a = group.localToWorld(new Vector3(f.minX, 0, f.minZ));
        const b = group.localToWorld(new Vector3(f.maxX, 0, f.maxZ));
        return {
          minX: Math.min(a.x, b.x),
          maxX: Math.max(a.x, b.x),
          minZ: Math.min(a.z, b.z),
          maxZ: Math.max(a.z, b.z),
        };
      });
    },
  };
}

/** Find every human ladder under a rendered room, including nested equipment. */
export function humanLadderZones(
  root: Object3D,
  floorAt?: (x: number, z: number) => number,
): LadderZone[] {
  root.updateWorldMatrix(true, true);
  const zones: LadderZone[] = [];
  for (const object of roomLadders(root)) {
    const record = records.get(object);
    if (record?.enabled()) {
      const zone = zoneOf(object as Group, record.layout);
      zone.canUseTop = record.topEnabled();
      zone.canUseBottom = record.bottomEnabled();
      if (floorAt && record.layout.kind === 'pool') {
        const lower = floorAt(zone.bottomExit.x, zone.bottomExit.z);
        if (Number.isFinite(lower)) zone.bottom = lower;
      }
      zones.push(zone);
    }
  }
  return zones;
}

/** A short guarded landing made with each elevated human ladder. */
export function humanLadderLandingAt(
  root: Object3D,
  x: number,
  z: number,
  previousY: number,
): number | null {
  root.updateWorldMatrix(true, true);
  let found: number | null = null;
  for (const object of roomLadders(root)) {
    const record = records.get(object);
    if (
      !record ||
      (record.layout.kind !== 'caged' && record.layout.kind !== 'utility')
    )
      continue;
    const zone = zoneOf(object as Group, record.layout);
    if (
      previousY >= zone.top - 0.5 &&
      Math.abs(x - zone.topExit.x) < 0.52 &&
      Math.abs(z - zone.topExit.z) < 0.4
    )
      found = zone.top;
  }
  return found;
}

/** Rail footprints on elevated ladder landings, in the room's scene units. */
export function humanLadderLandingSolids(root: Object3D): Footprint[] {
  root.updateWorldMatrix(true, true);
  const solids: Footprint[] = [];
  for (const ladder of roomLadders(root)) {
    for (const part of ladder.children) {
      if (
        !part.name.startsWith('Ladder landing') ||
        !part.name.endsWith('guard')
      )
        continue;
      const box = new Box3().setFromObject(part);
      solids.push({
        minX: box.min.x,
        maxX: box.max.x,
        minZ: box.min.z,
        maxZ: box.max.z,
      });
    }
  }
  return solids;
}

/**
 * A tank ladder's warnings (the owner, 2026-11-04): on the tank behind the
 * rungs, where the climber looks, a fall warning (ISO 7010 W008) and a
 * deep-water one; on the floor round its foot, a yellow and black hazard
 * border (BS 5499 / ISO 3864 striping), 1.2 m wide and 1.2 m out.
 */
function addTankLadderWarnings(
  kit: PanelKit,
  group: Group,
  bottom: number,
  top: number,
) {
  const signs: [Parameters<typeof createSafetySign>[1], string[], number][] = [
    [
      ['drop'],
      ['DANGER', 'Risk of falling'],
      Math.min(top - 0.25, bottom + 2.1),
    ],
    [
      ['deep-water'],
      ['DANGER', 'Deep water', 'Risk of drowning'],
      Math.min(top - 0.6, bottom + 1.6),
    ],
  ];
  for (const [pictogram, lines, y] of signs) {
    const sign = createSafetySign(kit, pictogram, lines);
    sign.position.set(0, y, 0.006);
    group.add(sign);
  }
  const t = plantTools(kit);
  const w = 1.2;
  const d = 1.2;
  const band = 0.1;
  const floor = t.printed(
    w,
    d,
    (c, cw, ch) => {
      c.clearRect(0, 0, cw, ch);
      const b = (band / w) * cw;
      c.save();
      c.beginPath();
      c.rect(0, 0, cw, ch);
      c.rect(b, b, cw - 2 * b, ch - 2 * b);
      c.clip('evenodd');
      c.fillStyle = '#f2c500';
      c.fillRect(0, 0, cw, ch);
      c.strokeStyle = '#111111';
      c.lineWidth = b * 0.7;
      for (let x = -ch; x < cw + ch; x += b * 1.4) {
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x + ch, ch);
        c.stroke();
      }
      c.restore();
    },
    256,
  );
  const material = floor.mesh.material as {
    transparent?: boolean;
    alphaTest?: number;
  };
  material.transparent = true;
  material.alphaTest = 0.5;
  floor.mesh.name = 'Ladder foot hazard marking';
  // Paint on the floor beside the machine, not part of its size.
  floor.mesh.userData.beside = true;
  floor.mesh.rotation.x = -Math.PI / 2;
  floor.mesh.position.set(0, bottom + 0.004, d / 2 + 0.02);
  group.add(floor.mesh);
}
