import {
  AmbientLight,
  Group,
  HemisphereLight,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Raycaster,
  Scene,
  Vector2,
} from 'three';
import type { Intersection, Object3D } from 'three';
import { METRE } from '../../components/core/logic/units';
import {
  createPanelKit,
  disposeKit,
} from '../../components/core/views/eighties-controls';
import { createSectionBoard } from '../../components/core/views/signage';
import { tools, SANS } from '../../components/core/views/fitting-tools';
import {
  createRenderer,
  useEnvironment,
  layoutSize,
} from '../../components/core/parts/render-style';
import { createPs1Material } from '../../components/core/parts/ps1-material';
import {
  createPartSet,
  pushButton,
  selector,
} from '../../components/core/parts/parts';
import { createFirstPerson } from '../../controls/input/first-person';
import { knobDirection } from '../../controls/input/knob-turning';
import { createBrandBadge } from '../../components/core/views/brand-badge';
import { createAqualisCabinet } from '../../components/plant/views/aqualis-cabinet';
import { driveCabinet } from '../../components/plant/views/aqualis-painter';
import { CABINET, PORTS } from '../../components/plant/logic/aqualis-cabinet';
import { createPeristalticPump } from '../../components/plant/views/peristaltic-pump';
import { createGasCylinder } from '../../components/plant/views/gas-cylinder';
import { CHANNELS } from '../../../game/plant/aqualis-types';
import {
  CO2_PORT_IDS,
  linePressure,
} from '../../../game/plant/co2-distribution';
import type { Co2PortId } from '../../../game/plant/co2-distribution';
import { CO2_DOSERS } from '../../../game/plant/co2-dosing';
import { createDialGauge } from '../../components/industrial-control/views/dial-gauge';
import { createGasBallValve } from '../../components/plant/views/gas-fittings';
import {
  CO2_PANEL_PORTS,
  createCo2DosingPanel,
} from '../views/co2-dosing-panel';
import {
  DEVICE_LEGEND,
  DEVICE_MODES,
  SPEED_LEGEND,
  WATCHDOG_LEGEND,
  createAqualisRoomHost,
} from './aqualis-room';
import type { AqualisRoomHost } from './aqualis-room';

/** The room inside, metres. */
const ROOM = { w: 9, d: 7, h: 3.4, wall: 0.2 };
/** Where the cabinet's back stands against the back wall. */
const CAB = { x: 0, z: -ROOM.d / 2 } as const;
/** The dosing pumps along the back wall, right of the cabinet. */
const UNIT_X: Record<'hypochlorite' | 'acid', number> = {
  hypochlorite: 1.15,
  acid: 2.05,
};
/** The ideal pumps: CO₂ is the plant rooms' real panels, on the front wall. */
const PUMP_IDS = ['hypochlorite', 'acid'] as const;
/**
 * The CO₂ bay on the front (south) wall, facing into the room (the owner,
 * 2026-11-01: "move the CO₂ dosing controller into the Aqualis Trio dev
 * room, and plumb it in there. I want to update its design."): each panel's
 * centre, x, at eye height, and the plane its pipes run in.
 */
const CO2_BAY = {
  panels: { plant_pool_01: 1.0, plant_pool_02: -1.0 } as Record<
    Co2PortId,
    number
  >,
  y: 1.5,
  pipeZ: ROOM.d / 2 - 0.06,
  header: 2.3,
  valve: 2.15,
  /** Each panel's gas line over the ceiling to its nozzle on the return. */
  over: { plant_pool_01: 3.0, plant_pool_02: 3.08 } as Record<
    Co2PortId,
    number
  >,
  nozzle: { plant_pool_01: -0.95, plant_pool_02: -1.45 } as Record<
    Co2PortId,
    number
  >,
};
/** The loop's line along the back wall, its height, m. */
const LINE_Y = 0.35;
const LINE_Z = -ROOM.d / 2 + 0.25;
/** The injection point, on the return line. */
const INJECT_X = -1.2;
/** Each dosing unit's output bargraph. */
const BAR_SEGMENTS = 10;

/**
 * Dev58, the Aqualis controller (mission 114, `doc/plans/114/`): the
 * Aqualis cabinet against the back wall on an ideal rig, a very simple loop
 * (a small pool, its pump and filter, one injection point, the cabinet's
 * sample tapping and return), and the dosing it drives: an ideal
 * hypochlorite pump and acid pump on the back wall, each with its own
 * REMOTE · MANUAL · OFF selector, and on the front wall the plant rooms'
 * own CO₂ dosing panels (mission 118), the Lounge's and the Olympic's, the
 * world's model and drawing, plumbed to their own nozzles on the return
 * (`aqualis-co2-rig.ts`); the scenario board and the time-speed knob on
 * the right wall. Everything it runs is behind one host (`aqualis-room.ts`);
 * `?view=room|cabinet|screen|units|board|crash|co2|co2-lounge|co2-olympic`
 * frames it. The cabinet's computer is on and running as the room loads
 * (`&boot=on` boots it instead, `&boot=20` 20 s into its boot); it boots
 * when its supply (the switch beside the time-speed knob, or its own
 * power switch) comes back, and at Restart on its Settings › Pool dynamics tab
 * (the other boot families' board is in dev0, `?room=dev0&view=boots`).
 * The crash board, left of the scenario board, crashes the
 * computer (BLUE SCREEN, GLITCH; `&crash=stop|glitch` crashes it two
 * seconds after it starts running), its watchdog as its WORKS · FAILS
 * switch is set (`&watchdog=works|fails`), with a CRASHED lamp and a
 * CONTROLLER FAULT window; `?view=crash` frames it. Each dosing unit's
 * bargraph shows what it delivers, so a held or lurching output shows.
 */
export function startAqualisControllerRoom(canvas: HTMLCanvasElement) {
  const m = METRE;
  const params = new URLSearchParams(location.search);
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  const freeEnvironment = useEnvironment(renderer, scene, 0.45);
  const camera = new PerspectiveCamera(60, 1, 0.05, 40 * m);
  const kit = createPanelKit();
  const t = tools(kit);
  const room = new Group();
  room.scale.setScalar(m);
  scene.add(room);
  scene.add(new HemisphereLight('#f4f7fa', '#5d5a55', 1.5));
  scene.add(new AmbientLight('#ffffff', 0.4));
  for (const x of [-2.5, 2.5]) {
    const lamp = new PointLight('#fff6e8', 7, 10 * m, 2);
    lamp.position.set(x * m, (ROOM.h - 0.3) * m, 0);
    scene.add(lamp);
  }
  const host: AqualisRoomHost = createAqualisRoomHost(
    (params.get('scenario') as never) ?? 'good',
    {
      // On and running from the start (the owner, 2026-10-31); it boots
      // after a power cycle or a Restart, or at load with `&boot=on` (or
      // `&boot=<seconds>` to start part-way through its boot).
      boot: params.get('boot') === 'on' || Number(params.get('boot')) > 0,
      bootAt: Number(params.get('boot')) || 0,
      crash:
        params.get('crash') === 'stop' || params.get('crash') === 'glitch'
          ? (params.get('crash') as 'stop' | 'glitch')
          : undefined,
      watchdog: params.get('watchdog') !== 'fails',
      consent: params.get('consent') === 'on',
    },
  );
  const parts = createPartSet();

  // ---- The room ---------------------------------------------------------------
  const { w, d, h, wall } = ROOM;
  const plaster = t.paint('#dfe3e4', 0.9);
  t.box(
    room,
    t.paint('#7e8a8f', 0.85),
    w + 2 * wall,
    wall,
    d + 2 * wall,
    0,
    -wall / 2,
    0,
  );
  t.box(room, plaster, w + 2 * wall, wall, d + 2 * wall, 0, h + wall / 2, 0);
  t.box(room, plaster, w + 2 * wall, h, wall, 0, h / 2, -d / 2 - wall / 2);
  t.box(room, plaster, w + 2 * wall, h, wall, 0, h / 2, d / 2 + wall / 2);
  t.box(room, plaster, wall, h, d, -w / 2 - wall / 2, h / 2, 0);
  t.box(room, plaster, wall, h, d, w / 2 + wall / 2, h / 2, 0);
  const sign = createSectionBoard(
    kit,
    'DEV58 · DOSING: THE AQUALIS CONTROLLER',
    5,
  );
  sign.position.set(0, 2.85, -d / 2 + 0.03);
  room.add(sign);

  // ---- The cabinet ---------------------------------------------------------------
  // The cabinet's supply (the wall board's switch) and its own power switch,
  // both on from the start (the owner, 2026-10-31).
  let supplyOn = true;
  let mainOn = true;
  /** The crash the piezo last answered. */
  let beeperCrash: unknown = null;
  const cabinet = createAqualisCabinet(kit, {
    screenTouch: (x, y) => host.screenTouch(x, y),
    selector: (s) => host.setSelector(s),
    sampleValve: (open) => host.sampleValve(open),
    // Its own power switch and the wall's supply in series: either off, it is off.
    power: (on) => {
      mainOn = on;
      host.setPower(supplyOn && mainOn);
    },
  });
  cabinet.setSelector(host.selector());
  cabinet.group.position.set(CAB.x, 0, CAB.z);
  room.add(cabinet.group);

  // ---- The loop: pool, pump, filter, injection point, sample tapping ---------------
  const pvc = t.paint('#6f767b', 0.5);
  const water = createPs1Material({
    color: '#4fb3d9',
    transparent: true,
    opacity: 0.8,
    roughness: 0.1,
  });
  kit.materials.push(water);
  const pipe = (
    x1: number,
    y1: number,
    z1: number,
    x2: number,
    y2: number,
    z2: number,
    r = 0.03,
    mat = pvc,
  ) => {
    const len = Math.hypot(x2 - x1, y2 - y1, z2 - z1);
    const axis =
      Math.abs(x2 - x1) > 1e-6 ? 'x' : Math.abs(y2 - y1) > 1e-6 ? 'y' : 'z';
    t.cyl(
      room,
      mat,
      r,
      len,
      (x1 + x2) / 2,
      (y1 + y2) / 2,
      (z1 + z2) / 2,
      axis,
      12,
    );
  };
  // The pool: a small tiled tank, open topped.
  const pool = { x: -3.1, z: -0.4, w: 2.0, d: 2.4, h: 0.7 };
  const tile = t.paint('#e9f2f5', 0.3);
  t.box(room, tile, pool.w, 0.06, pool.d, pool.x, 0.03, pool.z);
  for (const s of [-1, 1]) {
    t.box(
      room,
      tile,
      0.08,
      pool.h,
      pool.d,
      pool.x + (s * pool.w) / 2,
      pool.h / 2,
      pool.z,
    );
    t.box(
      room,
      tile,
      pool.w,
      pool.h,
      0.08,
      pool.x,
      pool.h / 2,
      pool.z + (s * pool.d) / 2,
    );
  }
  const surface = new Mesh(
    new PlaneGeometry(pool.w - 0.08, pool.d - 0.08),
    water,
  );
  surface.rotation.x = -Math.PI / 2;
  surface.position.set(pool.x, pool.h - 0.08, pool.z);
  room.add(surface);
  t.label(
    room,
    'IDEAL POOL · 150 m³',
    pool.x,
    pool.h - 0.2,
    pool.z + pool.d / 2 + 0.045,
    0.06,
    '#1b3b4b',
    '#ffffff',
  );
  // The circulation pump, left, drawing from the pool's back.
  const pumpX = -3.6;
  t.box(room, t.paint('#3a4148', 0.7), 0.5, 0.1, 0.35, pumpX, 0.05, LINE_Z);
  const pumpBody = t.paint('#2f6fb0', 0.4, 0.2);
  t.cyl(room, pumpBody, 0.11, 0.32, pumpX + 0.06, 0.25, LINE_Z, 'x');
  t.cyl(
    room,
    t.paint('#1f2a33', 0.4),
    0.15,
    0.08,
    pumpX - 0.16,
    0.3,
    LINE_Z,
    'x',
  );
  t.label(
    room,
    'P1 CIRCULATION',
    pumpX,
    0.55,
    LINE_Z + 0.18,
    0.04,
    '#1b1b1b',
    '#ffffff',
  );
  const pumpLamp = t.led(
    room,
    '#3ddc5a',
    0.02,
    pumpX + 0.06,
    0.4,
    LINE_Z + 0.12,
  );
  // Suction: from the pool's back wall to the pump.
  pipe(
    pumpX - 0.2,
    0.3,
    pool.z - pool.d / 2,
    pumpX - 0.2,
    0.3,
    LINE_Z + 0.03,
    0.04,
  );
  // The filter, a vertical vessel, between the pump and the cabinet.
  const filterX = -2.3;
  const vessel = t.paint('#2c6e9b', 0.3, 0.2);
  t.cyl(room, vessel, 0.32, 1.1, filterX, 0.75, LINE_Z, 'y', 24);
  t.cyl(room, vessel, 0.3, 0.08, filterX, 1.34, LINE_Z, 'y', 24);
  for (const a of [0, 2.1, 4.2])
    t.cyl(
      room,
      t.paint('#3a4148', 0.6),
      0.03,
      0.2,
      filterX + 0.25 * Math.cos(a),
      0.1,
      LINE_Z + 0.25 * Math.sin(a),
    );
  t.label(
    room,
    'F1 SAND FILTER',
    filterX,
    1.0,
    LINE_Z + 0.325,
    0.05,
    '#ffffff',
  );
  pipe(pumpX + 0.22, LINE_Y, LINE_Z, filterX - 0.32, LINE_Y, LINE_Z, 0.04);
  // The return: out of the filter, along the wall past the injection point, then back to the pool.
  pipe(filterX + 0.32, LINE_Y, LINE_Z, -0.5, LINE_Y, LINE_Z, 0.04);
  pipe(-0.5, LINE_Y, LINE_Z, -0.5, LINE_Y, pool.z - 0.3, 0.04);
  pipe(
    -0.5,
    LINE_Y,
    pool.z - 0.3,
    pool.x + pool.w / 2,
    LINE_Y,
    pool.z - 0.3,
    0.04,
  );
  // Flow arrows on the line.
  for (const x of [-3.0, -1.7, -0.9])
    t.label(
      room,
      '→ FLOW',
      x,
      LINE_Y + 0.06,
      LINE_Z + 0.045,
      0.03,
      '#1b1b1b',
      '#9fd36a',
    );
  // The injection point: a quill on the return, the dosing lines down into it.
  t.cyl(
    room,
    t.paint('#d8d8d0', 0.4),
    0.045,
    0.12,
    INJECT_X,
    LINE_Y + 0.08,
    LINE_Z,
    'y',
  );
  t.label(
    room,
    'INJECTION POINT',
    INJECT_X,
    LINE_Y + 0.22,
    LINE_Z + 0.05,
    0.03,
    '#1b1b1b',
    '#ffffff',
  );
  // The sample tapping upstream of the injection, and its return downstream, to the cabinet's side.
  const cab = (p: (typeof PORTS)['sampleIn']) =>
    [CAB.x + p.at[0] - 0.18, p.at[1], CAB.z + p.at[2]] as const;
  const [ix, iy, iz] = cab(PORTS.sampleIn);
  const [ox, oy, oz] = cab(PORTS.sampleOut);
  const thin = t.paint('#9aa1a5', 0.5);
  pipe(-1.6, LINE_Y, LINE_Z, -1.6, LINE_Y, iz, 0.012, thin);
  pipe(-1.6, LINE_Y, iz, -1.6, iy, iz, 0.012, thin);
  pipe(-1.6, iy, iz, ix, iy, iz, 0.012, thin);
  pipe(-0.75, LINE_Y, LINE_Z, -0.75, oy, oz, 0.012, thin);
  pipe(-0.75, oy, oz, ox, oy, oz, 0.012, thin);
  t.label(
    room,
    'SAMPLE TAPPING',
    -1.6,
    LINE_Y + 0.13,
    LINE_Z + 0.05,
    0.025,
    '#1b1b1b',
    '#ffffff',
  );

  // ---- The dosing units -----------------------------------------------------------
  const board = t.paint('#f1f2ee', 0.6);
  const units = PUMP_IDS.map((id) => {
    const x = UNIT_X[id];
    const unit = new Group();
    unit.position.set(x, 0, -d / 2);
    room.add(unit);
    // The wall board, its title, its selector and its lamps.
    t.box(unit, board, 0.8, 0.9, 0.02, 0, 1.25, 0.01);
    t.label(
      unit,
      CHANNELS[id].name.toUpperCase(),
      0,
      1.62,
      0.025,
      0.032,
      '#1b1b1b',
    );
    t.label(unit, 'DOSING PUMP', 0, 1.56, 0.025, 0.025, '#4a5258');
    const sel = parts.add(
      selector(kit, {
        positions: 3,
        initial: DEVICE_MODES.indexOf(host.deviceMode(id)),
        bound: {
          get value() {
            return DEVICE_MODES.indexOf(host.deviceMode(id));
          },
          set: (k: number) => host.setDeviceMode(id, DEVICE_MODES[k]),
        },
        legend: DEVICE_LEGEND,
        name: `${CHANNELS[id].name} ${DEVICE_LEGEND} selector`,
      }),
    );
    sel.object.position.set(-0.15, 1.38, 0.02);
    unit.add(sel.object);
    t.label(unit, 'REMOTE  MANUAL  OFF', -0.15, 1.31, 0.025, 0.016, '#30383e');
    const run = t.led(unit, '#3ddc5a', 0.012, 0.12, 1.42, 0.03);
    const fault = t.led(unit, '#ff3b2f', 0.012, 0.22, 1.42, 0.03);
    t.label(unit, 'RUN', 0.12, 1.39, 0.025, 0.018, '#30383e');
    t.label(unit, 'FAULT', 0.22, 1.39, 0.025, 0.018, '#30383e');
    // Its output: a ten-segment bargraph, 10 % a segment, of its most.
    const bar = Array.from({ length: BAR_SEGMENTS }, (_, i) =>
      t.led(
        unit,
        i >= BAR_SEGMENTS - 2 ? '#ffb000' : '#3ddc5a',
        0.011,
        -0.2 + i * 0.045,
        1.23,
        0.03,
      ),
    );
    t.label(unit, 'OUTPUT  0 — 100 %', 0, 1.19, 0.025, 0.016, '#30383e');
    t.label(
      unit,
      `PORT: AQUALIS ${id === 'acid' ? 'HCl' : 'NaOCl'}`,
      0,
      0.84,
      0.025,
      0.02,
      '#4a5258',
    );
    // The source under it: a drum that never runs dry.
    const pump = createPeristalticPump(kit, id === 'acid' ? 'HCl' : 'NaOCl');
    {
      const drum = t.paint(id === 'acid' ? '#2f6db5' : '#e6d94a', 0.5);
      t.cyl(unit, drum, 0.2, 0.6, 0, 0.3, 0.35, 'y', 20);
      t.cyl(unit, t.paint('#2a2f33', 0.5), 0.04, 0.04, 0.08, 0.62, 0.35);
      t.label(
        unit,
        'IDEAL SOURCE',
        0,
        0.42,
        0.551,
        0.035,
        '#1b1b1b',
        '#ffffff',
      );
      // The pump on its bracket.
      t.box(unit, t.paint('#3a4148', 0.6), 0.28, 0.02, 0.2, 0, 0.94, 0.11);
      pump.object.position.set(0, 0.95, 0.12);
      unit.add(pump.object);
      pipe(
        x + 0.08,
        0.62,
        -d / 2 + 0.35,
        x + 0.08,
        0.95,
        -d / 2 + 0.35,
        0.006,
        t.paint('#e8e8e0', 0.5),
      );
    }
    // Its dosing line up the wall, along to the injection point.
    const lineY = 2.35 + PUMP_IDS.indexOf(id) * 0.06;
    const lineZ = -d / 2 + 0.06 + PUMP_IDS.indexOf(id) * 0.03;
    const tube = t.paint(id === 'acid' ? '#2f6db5' : '#e6d94a', 0.5);
    pipe(x, 1.7, lineZ, x, lineY, lineZ, 0.008, tube);
    pipe(x, lineY, lineZ, INJECT_X, lineY, lineZ, 0.008, tube);
    pipe(INJECT_X, lineY, lineZ, INJECT_X, LINE_Y + 0.14, lineZ, 0.008, tube);
    return { id, pump, run, fault, bar };
  });

  // ---- CO₂: the plant rooms' own panels, plumbed into the rig --------------------------
  // The panel model the world runs (`aqualis-co2-rig.ts`), drawn by the
  // plant rooms' own drawing (`co2-dosing-panel.ts`): the Lounge's mass
  // flow controller (500 g/h) on the left, the Olympic's (2 kg/h) on the
  // right, both the plant rooms' design (the owner, 2026-11-01), each on its wall port off a stand-in for the building line, the
  // Trio's CO₂ cable on whichever its changeover selector chooses, and each
  // panel's line over the ceiling to its own nozzle on the rig's return.
  const copper = t.paint('#b8734a', 0.35, 0.8);
  const band = t.paint('#b9bcbc', 0.6);
  const co2Pipe = (pts: readonly (readonly [number, number, number])[]) => {
    for (let i = 1; i < pts.length; i++)
      pipe(...pts[i - 1], ...pts[i], 0.0075, copper);
  };
  const bay = new Group();
  bay.position.set(0, 0, d / 2);
  bay.rotation.y = Math.PI;
  room.add(bay);
  const baySign = createSectionBoard(
    kit,
    'CO₂ DOSING · THE PLANT ROOMS’ PANELS',
    4,
  );
  baySign.position.set(0, 2.85, 0.03);
  bay.add(baySign);
  const co2Lamp = new PointLight('#fff6e8', 6, 6 * m, 2);
  co2Lamp.position.set(0, 2.7 * m, (d / 2 - 1.3) * m);
  scene.add(co2Lamp);
  const { pipeZ } = CO2_BAY;
  // The stand-in supply: one cylinder, its regulator and the line's gauge.
  const cylinder = createGasCylinder(kit, { gas: 'co2', contents: 'in-use' });
  cylinder.group.position.set(0, 0, d / 2 - 0.3);
  room.add(cylinder.group);
  t.box(room, t.paint('#b08d45', 0.35, 0.8), 0.07, 0.09, 0.06, 0, 1.3, pipeZ);
  const lineGauge = createDialGauge(kit, {
    dia: 0.1,
    max: 6,
    unit: 'bar',
    legend: 'LINE',
    entry: 'back',
  });
  lineGauge.group.position.set(0, 1.45, pipeZ - 0.03);
  lineGauge.group.rotation.y = Math.PI;
  room.add(lineGauge.group);
  t.label(
    bay,
    'LP CO₂ SUPPLY · 4 bar',
    0,
    1.62,
    0.07,
    0.025,
    '#1b1b1b',
    '#ffffff',
  );
  t.label(
    bay,
    'STAND-IN FOR THE BUILDING LINE',
    0,
    1.58,
    0.07,
    0.016,
    '#30383e',
    '#ffffff',
  );
  co2Pipe([
    [0, 1.35, pipeZ],
    [0, CO2_BAY.header, pipeZ],
  ]);
  /** A panel's inlet, x: its panel turned to face the room. */
  const inX = (id: Co2PortId) => CO2_BAY.panels[id] - CO2_PANEL_PORTS.inlet[0];
  co2Pipe([
    [inX('plant_pool_02'), CO2_BAY.header, pipeZ],
    [inX('plant_pool_01'), CO2_BAY.header, pipeZ],
  ]);
  t.cyl(room, band, 0.009, 0.06, 0.3, CO2_BAY.header, pipeZ, 'x', 12);
  t.label(
    bay,
    'CO₂',
    -0.3,
    CO2_BAY.header + 0.03,
    0.07,
    0.018,
    '#1b1b1b',
    '#e9e9e4',
  );
  const panels = CO2_PORT_IDS.map((id) => {
    const px = CO2_BAY.panels[id];
    const x = inX(id);
    const pool = id === 'plant_pool_01' ? 'Lounge' : 'Olympic';
    const panel = createCo2DosingPanel(
      kit,
      CO2_DOSERS[id].kind,
      () => host.co2Panel(id),
      {
        setMode: (mode) => host.setCo2Mode(id, mode),
        setManualRate: (gh) => host.setCo2Rate(id, gh),
        reset: () => host.resetCo2(id),
        setOn: (on) => host.actOnCo2(id, { kind: 'on', on }),
        setHand: (hand) => host.actOnCo2(id, { kind: 'hand', hand }),
        setOverride: (override) =>
          host.actOnCo2(id, { kind: 'override', override }),
      },
      `${pool} pool CO₂ dosing valve controller`,
    );
    panel.object.position.set(px, CO2_BAY.y, d / 2 - 0.14);
    panel.object.rotation.y = Math.PI;
    room.add(panel.object);
    t.label(
      bay,
      id === 'plant_pool_01'
        ? 'LOUNGE · PL1-CP4 · MASS FLOW CONTROLLER'
        : 'OLYMPIC · PL2-CP4 · MASS FLOW CONTROLLER',
      -px,
      CO2_BAY.y + 0.5,
      0.03,
      0.026,
      '#1b1b1b',
      '#ffffff',
    );
    // Its wall port: the lever ball valve on its drop, and its gauge.
    const top = CO2_BAY.y + CO2_PANEL_PORTS.inlet[1];
    co2Pipe([
      [x, CO2_BAY.header, pipeZ],
      [x, top, pipeZ],
    ]);
    const valve = parts.add(
      createGasBallValve(kit, {
        pipeRadius: 0.0075,
        name: `${pool} CO₂ wall port isolating valve`,
        binding: {
          open: () => host.co2().plant.distribution.ports[id].open,
          set: (open) => host.setCo2Port(id, open),
        },
      }),
    );
    const holder = new Group();
    holder.position.set(x, CO2_BAY.valve, pipeZ);
    holder.rotation.y = Math.PI / 2;
    valve.object.rotation.z = Math.PI / 2;
    holder.add(valve.object);
    room.add(holder);
    const gauge = createDialGauge(kit, {
      dia: 0.07,
      max: 6,
      unit: 'bar',
      legend: 'PORT',
      entry: 'back',
    });
    gauge.group.position.set(
      x + (id === 'plant_pool_01' ? 0.12 : -0.12),
      CO2_BAY.valve,
      pipeZ - 0.02,
    );
    gauge.group.rotation.y = Math.PI;
    room.add(gauge.group);
    // Its gas line: down from its outlet, out past its side, up and over
    // the ceiling to its nozzle on the return, through its non-return valve.
    const out = CO2_BAY.y + CO2_PANEL_PORTS.outlet[1];
    const side = px + (id === 'plant_pool_01' ? 0.42 : -0.42);
    const over = CO2_BAY.over[id];
    const nx = CO2_BAY.nozzle[id];
    const nz = LINE_Z + 0.07;
    co2Pipe([
      [x, out, pipeZ],
      [x, out - 0.1, pipeZ],
      [side, out - 0.1, pipeZ],
      [side, over, pipeZ],
      [side, over, nz],
      [nx, over, nz],
      [nx, LINE_Y + 0.2, nz],
      [nx, LINE_Y + 0.2, LINE_Z],
      [nx, LINE_Y + 0.06, LINE_Z],
    ]);
    // The nozzle's non-return valve and its injection cone in the return.
    t.cyl(
      room,
      t.paint('#b08d45', 0.35, 0.8),
      0.014,
      0.05,
      nx,
      LINE_Y + 0.13,
      LINE_Z,
      'y',
      6,
    );
    t.cyl(
      room,
      t.paint('#d8d8d0', 0.4),
      0.03,
      0.06,
      nx,
      LINE_Y + 0.06,
      LINE_Z,
      'y',
    );
    t.label(
      room,
      id === 'plant_pool_01' ? 'CO₂ NOZZLE · PL1' : 'CO₂ NOZZLE · PL2',
      nx,
      LINE_Y + 0.26,
      LINE_Z + 0.05,
      0.022,
      '#1b1b1b',
      '#ffffff',
    );
    return { id, panel, gauge };
  });
  // The Trio's CO₂ control cable: on one panel or the other.
  t.box(
    room,
    t.paint('#c8ccc9', 0.5),
    0.22,
    0.2,
    0.08,
    -0.35,
    1.75,
    d / 2 - 0.04,
  );
  const cable = parts.add(
    selector(kit, {
      positions: 2,
      initial: CO2_PORT_IDS.indexOf(host.co2().plugged),
      bound: {
        get value() {
          return CO2_PORT_IDS.indexOf(host.co2().plugged);
        },
        set: (k: number) => host.plugCo2(CO2_PORT_IDS[k]),
      },
      legend: 'TRIO CO₂ CABLE: LOUNGE · OLYMPIC',
      name: 'Trio CO₂ cable selector',
    }),
  );
  cable.object.position.set(-0.35, 1.73, d / 2 - 0.081);
  cable.object.rotation.y = Math.PI;
  room.add(cable.object);
  // The control cables: a tray from the cabinet's glands across to the units.
  t.box(
    room,
    t.paint('#9aa1a5', 0.4, 0.5),
    3.6,
    0.03,
    0.15,
    1.55,
    CABINET.h + 0.27,
    -d / 2 + 0.12,
  );
  t.label(
    room,
    'CONTROL CABLES · AQUALIS PORTS',
    1.55,
    CABINET.h + 0.31,
    -d / 2 + 0.2,
    0.025,
    '#1b1b1b',
    '#ffffff',
  );

  // ---- The scenario board and the time-speed knob, on the right wall ----------------
  const wallBoard = new Group();
  wallBoard.position.set(w / 2, 0, -0.6);
  wallBoard.rotation.y = -Math.PI / 2;
  room.add(wallBoard);
  const rows = host.scenarios.length;
  const rowH = 0.075;
  const boardH = rows * rowH + 0.55;
  t.box(
    wallBoard,
    t.paint('#2e3438', 0.5),
    1.1,
    boardH,
    0.03,
    0,
    0.75 + boardH / 2,
    0.015,
  );
  const plate = t.printed(0.8, rows * rowH, () => {}, 512);
  plate.mesh.position.set(0.12, 0.75 + 0.35 + (rows * rowH) / 2, 0.032);
  wallBoard.add(plate.mesh);
  let shown = '';
  const drawPlate = () => {
    const key = host.scenario();
    if (key === shown) return;
    shown = key;
    const c = plate.context;
    const cw = c.canvas.width;
    const ch = c.canvas.height;
    c.fillStyle = '#f4f3ee';
    c.fillRect(0, 0, cw, ch);
    const rh = ch / rows;
    host.scenarios.forEach((s, i) => {
      const on = s.id === key;
      c.fillStyle = on ? '#1f7fd6' : i % 2 ? '#e8e8e2' : '#f4f3ee';
      c.fillRect(0, i * rh, cw, rh);
      c.fillStyle = on ? '#ffffff' : '#1b1b1b';
      c.font = `bold ${Math.round(rh * 0.42)}px ${SANS}`;
      c.textBaseline = 'middle';
      c.fillText(s.name, 10, i * rh + rh * 0.36);
      c.font = `${Math.round(rh * 0.26)}px ${SANS}`;
      c.fillText(s.description.slice(0, 70), 10, i * rh + rh * 0.76);
    });
    plate.texture.needsUpdate = true;
  };
  drawPlate();
  host.scenarios.forEach((s, i) => {
    const b = parts.add(
      pushButton(kit, {
        colour: 'blue',
        name: `Scenario ${s.name}`,
        action: () => host.chooseScenario(s.id),
      }),
    );
    b.object.scale.setScalar(0.6);
    b.object.position.set(-0.36, 0.75 + 0.35 + (rows - i - 0.5) * rowH, 0.03);
    wallBoard.add(b.object);
  });
  t.label(
    wallBoard,
    'WATER SCENARIOS',
    0,
    0.75 + boardH - 0.06,
    0.032,
    0.04,
    '#ffffff',
  );
  const badge = createBrandBadge(kit, 'aqualis', {
    height: 0.03,
    maxWidth: 0.25,
    plate: '#ffffff',
  });
  badge.position.set(0.38, 0.75 + boardH - 0.06, 0.032);
  wallBoard.add(badge);
  const speedKnob = parts.add(
    selector(kit, {
      positions: 4,
      initial: host.speed(),
      bound: {
        get value() {
          return host.speed();
        },
        set: (k: number) => host.setSpeed(k),
      },
      legend: SPEED_LEGEND,
      name: 'Rig time speed selector',
    }),
  );
  speedKnob.object.position.set(0, 0.92, 0.03);
  speedKnob.object.scale.setScalar(1.4);
  t.label(wallBoard, '1×   10×   100×   1000×', 0, 0.8, 0.032, 0.03, '#ffffff');
  wallBoard.add(speedKnob.object);
  t.label(wallBoard, 'TIME SPEED', 0, 1.06, 0.032, 0.03, '#ffffff');
  // The cabinet's supply: off and on again, it boots as after a power cut.
  const supply = parts.add(
    selector(kit, {
      positions: 2,
      initial: 1,
      bound: {
        get value() {
          return supplyOn ? 1 : 0;
        },
        set: (k: number) => {
          supplyOn = k === 1;
          host.setPower(supplyOn && mainOn);
        },
      },
      legend: 'OFF · ON',
      name: 'Aqualis cabinet supply switch',
    }),
  );
  supply.object.position.set(-0.4, 0.92, 0.03);
  wallBoard.add(supply.object);
  t.label(wallBoard, 'CABINET SUPPLY', -0.4, 1.06, 0.032, 0.026, '#ffffff');
  t.label(wallBoard, 'OFF    ON', -0.4, 0.8, 0.032, 0.026, '#ffffff');

  // ---- The crash board: force the computer to crash, its watchdog as switched ------
  const crashBoard = new Group();
  crashBoard.position.set(w / 2, 0, -2.05);
  crashBoard.rotation.y = -Math.PI / 2;
  room.add(crashBoard);
  t.box(crashBoard, t.paint('#3a2f30', 0.5), 0.78, 0.72, 0.03, 0, 1.4, 0.015);
  t.label(crashBoard, 'CRASH BOARD', 0, 1.7, 0.032, 0.036, '#ffffff');
  t.label(
    crashBoard,
    'FORCES THE TRIO’S COMPUTER TO CRASH',
    0,
    1.65,
    0.032,
    0.018,
    '#d8c9c9',
  );
  const crashButton = (kind: 'stop' | 'glitch', x: number) => {
    const b = parts.add(
      pushButton(kit, {
        colour: kind === 'stop' ? 'blue' : 'yellow',
        name: kind === 'stop' ? 'Crash: blue screen' : 'Crash: glitch',
        action: () => host.crash(kind),
      }),
    );
    b.object.scale.setScalar(0.8);
    b.object.position.set(x, 1.5, 0.03);
    crashBoard.add(b.object);
    t.label(
      crashBoard,
      kind === 'stop' ? 'BLUE SCREEN' : 'GLITCH',
      x,
      1.42,
      0.032,
      0.022,
      '#ffffff',
    );
  };
  crashButton('stop', -0.25);
  crashButton('glitch', -0.03);
  const watchdogSwitch = parts.add(
    selector(kit, {
      positions: 2,
      initial: host.watchdog() ? 0 : 1,
      bound: {
        get value() {
          return host.watchdog() ? 0 : 1;
        },
        set: (k: number) => host.setWatchdog(k === 0),
      },
      legend: WATCHDOG_LEGEND,
      name: `Watchdog ${WATCHDOG_LEGEND} switch`,
    }),
  );
  watchdogSwitch.object.position.set(0.22, 1.5, 0.03);
  crashBoard.add(watchdogSwitch.object);
  t.label(crashBoard, 'WATCHDOG', 0.22, 1.59, 0.032, 0.022, '#ffffff');
  t.label(crashBoard, 'WORKS  FAILS', 0.22, 1.42, 0.032, 0.02, '#ffffff');
  const crashedLamp = t.led(crashBoard, '#ff3b2f', 0.018, -0.25, 1.24, 0.03);
  t.label(crashBoard, 'CRASHED', -0.25, 1.19, 0.032, 0.022, '#ffffff');
  // CONTROLLER FAULT: a small window standing in for an annunciator's.
  const faultWindow = t.printed(0.3, 0.1, () => {}, 256, true);
  faultWindow.mesh.position.set(0.12, 1.22, 0.032);
  crashBoard.add(faultWindow.mesh);
  let faultShown: string | null = null;
  const drawFaultWindow = () => {
    const lit = host.controllerFault();
    // While a crash is counted down, the window counts it (the owner,
    // 2026-10-31: five seconds from the button to the crash).
    const left = host.crashIn();
    const count = left === null ? null : Math.ceil(left);
    const key = count !== null ? `in${count}` : lit ? 'fault' : 'dark';
    if (key === faultShown) return;
    faultShown = key;
    const c = faultWindow.context;
    const cw = c.canvas.width;
    const ch = c.canvas.height;
    c.fillStyle = count !== null ? '#2a0f0f' : lit ? '#ffb000' : '#3b3326';
    c.fillRect(0, 0, cw, ch);
    c.strokeStyle = '#111111';
    c.lineWidth = 6;
    c.strokeRect(3, 3, cw - 6, ch - 6);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    if (count !== null) {
      c.fillStyle = '#ff5a4a';
      c.font = `bold ${Math.round(ch * 0.26)}px ${SANS}`;
      c.fillText('CRASH IN', cw / 2, ch * 0.3);
      c.font = `bold ${Math.round(ch * 0.42)}px ${SANS}`;
      c.fillText(`${count} s`, cw / 2, ch * 0.7);
    } else {
      c.fillStyle = lit ? '#1b1200' : '#6d604a';
      c.font = `bold ${Math.round(ch * 0.3)}px ${SANS}`;
      c.fillText('CONTROLLER', cw / 2, ch * 0.33);
      c.fillText('FAULT', cw / 2, ch * 0.7);
    }
    faultWindow.texture.needsUpdate = true;
  };
  drawFaultWindow();
  t.label(
    crashBoard,
    'RECOVER: CABINET SUPPLY OFF, THEN ON',
    0,
    1.09,
    0.032,
    0.018,
    '#d8c9c9',
  );

  // ---- Walking and touching ---------------------------------------------------------
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const extraUses = new Map<Object3D, (direction?: number) => void>();
  for (const u of units)
    for (const [o, use] of u.pump.parts.uses) extraUses.set(o, use);
  for (const p of panels)
    for (const [o, use] of p.panel.parts.uses) extraUses.set(o, use);
  const usable = (hit: Intersection) => {
    if (cabinet.aimed(hit.object, hit.uv))
      return () =>
        cabinet.touch(
          hit.object,
          hit.uv,
          knobDirection(hit.object, hit.point, camera),
        );
    for (let o: Object3D | null = hit.object; o; o = o.parent) {
      const work = parts.uses.get(o) ?? extraUses.get(o);
      if (work) {
        const at = o;
        return () => work(knobDirection(at, hit.point, camera));
      }
    }
    return null;
  };
  const usableAt = (x: number, y: number) => {
    raycaster.setFromCamera(pointer.set(x, y), camera);
    const hit = raycaster.intersectObject(room, true)[0];
    if (!hit || hit.distance > 2.5 * m) return null;
    return usable(hit);
  };
  const views: Record<
    string,
    { x: number; z: number; yaw: number; pitch: number }
  > = {
    room: { x: 0, z: 2.6 * m, yaw: 0, pitch: -0.12 },
    cabinet: { x: 0, z: -1.9 * m, yaw: 0, pitch: -0.12 },
    screen: { x: 0, z: -2.6 * m, yaw: 0, pitch: -0.5 },
    units: { x: 2.1 * m, z: -1.5 * m, yaw: 0, pitch: -0.2 },
    board: { x: 3.0 * m, z: -0.6 * m, yaw: Math.PI / 2, pitch: -0.15 },
    crash: { x: 3.2 * m, z: -2.05 * m, yaw: Math.PI / 2, pitch: -0.3 },
    // The CO₂ bay on the front wall, and each panel close to.
    co2: { x: 0, z: (d / 2 - 2.9) * m, yaw: Math.PI, pitch: -0.04 },
    'co2-lounge': {
      x: 1.0 * m,
      z: (d / 2 - 1.05) * m,
      yaw: Math.PI,
      pitch: -0.1,
    },
    'co2-olympic': {
      x: -1.0 * m,
      z: (d / 2 - 1.05) * m,
      yaw: Math.PI,
      pitch: -0.1,
    },
  };
  const half = (s: number) => (s / 2) * m;
  const walk = createFirstPerson({
    scene,
    canvas,
    camera,
    metre: m,
    floorY: 0,
    objects: scene,
    start: views[params.get('view') ?? ''] ?? views.room,
    solids: () => [
      { minX: -half(w) - m, maxX: -half(w), minZ: -half(d), maxZ: half(d) },
      { minX: half(w), maxX: half(w) + m, minZ: -half(d), maxZ: half(d) },
      { minX: -half(w), maxX: half(w), minZ: -half(d) - m, maxZ: -half(d) },
      { minX: -half(w), maxX: half(w), minZ: half(d), maxZ: half(d) + m },
      // The pool, the cabinet, and the plant along the back wall.
      {
        minX: (pool.x - pool.w / 2) * m,
        maxX: (pool.x + pool.w / 2) * m,
        minZ: (pool.z - pool.d / 2) * m,
        maxZ: (pool.z + pool.d / 2) * m,
      },
      {
        minX: -half(w),
        maxX: half(w),
        minZ: -half(d),
        maxZ: (-d / 2 + CABINET.d + 0.25) * m,
      },
      // The CO₂ bay along the front wall: its panels, as deep as what
      // stands proudest of them (the mass flow controller on its line),
      // so a player can walk up close to read and work them; and the
      // cylinder, standing further out, on its own.
      {
        minX: -1.5 * m,
        maxX: 1.5 * m,
        minZ: (d / 2 - 0.3) * m,
        maxZ: half(d),
      },
      {
        minX: -0.2 * m,
        maxX: 0.2 * m,
        minZ: (d / 2 - 0.45) * m,
        maxZ: half(d),
      },
    ],
    use: (x, y) => usableAt(x, y)?.(),
    aimed: () => usableAt(0, 0) !== null,
  });
  const resize = () => {
    const { width, height } = layoutSize(canvas);
    if (!width || !height) return;
    renderer.setSize(Math.round(width), Math.round(height), false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  // For scripts checking the room: `dev58.useAt(0, 0)` uses whatever is under the crosshair, as a click does.
  Object.assign(window, {
    dev58: {
      host,
      cabinet,
      camera,
      useAt: (x = 0, y = 0) => usableAt(x, y)?.(),
    },
  });

  // ---- Each frame --------------------------------------------------------------------
  let last = 0;
  renderer.setAnimationLoop((time) => {
    if (canvas.parentElement?.hidden) {
      last = 0;
      return;
    }
    const delta = last ? Math.min(0.1, (time - last) / 1000) : 0;
    last = time;
    host.step(delta);
    // The cabinet, driven as a plant room's Trio is (`aqualis-painter.ts`).
    beeperCrash = driveCabinet(cabinet, host, beeperCrash);
    for (const u of units) {
      const fb = host.feedback(u.id);
      u.run.set(Boolean(fb?.running));
      u.fault.set(Boolean(fb?.fault));
      const level = fb && fb.most > 0 ? fb.delivering / fb.most : 0;
      u.bar.forEach((seg, i) => seg.set(level > (i + 0.5) / BAR_SEGMENTS));
      u.pump.update(delta, Boolean(fb?.running));
    }
    lineGauge.set(linePressure(host.co2().plant.distribution));
    lineGauge.update(delta);
    for (const p of panels) {
      p.gauge.set(host.co2Panel(p.id).inletBar);
      p.gauge.update(delta);
      p.panel.update(delta);
      p.panel.parts.update(delta);
    }
    pumpLamp.set(host.pumpRunning());
    const left = host.crashIn();
    crashedLamp.set(
      host.crashed() || (left !== null && Math.floor(left * 2) % 2 === 0),
    );
    drawFaultWindow();
    drawPlate();
    parts.update(delta);
    walk.update(delta);
    cabinet.update(delta);
    renderer.render(scene, camera);
  });
  const dispose = () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    walk.dispose();
    parts.dispose();
    for (const p of panels) p.panel.dispose();
    cabinet.dispose();
    disposeKit(kit, scene as unknown as Group);
    freeEnvironment();
    renderer.dispose();
  };
  return Object.assign(dispose, {
    enter() {
      const view =
        views[new URLSearchParams(location.search).get('view') ?? ''];
      if (view) walk.place(view.x, view.z, view.yaw, view.pitch);
    },
  });
}
