import { Group, Mesh } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { PanelKit } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { brandById } from '../../core/logic/brands';
import type { BrandId } from '../../core/logic/brands';
import { drawBrandMark, wordmarkFont } from '../../core/views/brand-logo';

/**
 * The Water Margin pool temperature controller — VISUAL MODEL ONLY
 * (rough, 2026-11-03, for the owner to look at while the pure HMI logic is
 * written). A modern wall-mounted touch-screen controller for a pool-water
 * heat exchanger, after the DULCOMARIN 3 class of instruments: a grey
 * moulded body, a deep blue-grey front with a 7" touch screen, a POWER
 * lamp, cable glands along its foot, and a rating plate on its side. Its
 * maker is Water Margin (水浒, a Chinese instrumentation brand), its mark a
 * pair of stylized waves forming a W, its Chinese subtitle along the
 * bottom: 超级先进型水管理方案 — "Super Advanced Type Water Management
 * Solutions".
 */

/** Its body, metres. */
export const WATERSHED_BODY = { w: 0.43, h: 0.29, d: 0.15 } as const;

/** Its 7" screen's opening on the front, metres from its middle. */
export const WATERSHED_SCREEN = {
  x: -0.03,
  y: 0.025,
  w: 0.154,
  h: 0.0924,
} as const;

/** The controller's maker: Water Margin (the owner, 2026-11-03). */
export const WATER_MARGIN: BrandId = 'water-margin';

/**
 * The controller's rough visual model, facing +z, its back at z = 0, its
 * middle at the origin. `pool` names its tag on the face; the probe's
 * spool and its cables are drawn beside it for the wall-cabinet exhibit.
 */
export function createWatershedControllerVisual(
  kit: PanelKit,
  pool: 'pool_01' | 'pool_02' = 'pool_01',
) {
  const t = tools(kit);
  const B = WATERSHED_BODY;
  const tag = pool === 'pool_01' ? 'PL1-TC1' : 'PL2-TC1';
  const group = new Group();
  group.name = `${tag} Watershed pool temperature controller`;

  // The moulded body, grey.
  const body = new Mesh(
    new RoundedBoxGeometry(B.w, B.h, B.d - 0.02, 4, 0.012),
    t.paint('#b9bdbd', 0.75),
  );
  body.position.set(0, 0, (B.d - 0.02) / 2);
  group.add(body);
  // The front, a deep blue-grey.
  const front = new Mesh(
    new RoundedBoxGeometry(B.w, B.h, 0.03, 4, 0.01),
    t.paint('#2c3a44', 0.6),
  );
  front.position.set(0, 0, B.d - 0.015);
  group.add(front);
  const z = B.d + 0.0002;
  // The screen's recess, darker, and its glass.
  const recess = new Mesh(
    new RoundedBoxGeometry(
      WATERSHED_SCREEN.w + 0.024,
      WATERSHED_SCREEN.h + 0.024,
      0.004,
      2,
      0.006,
    ),
    t.paint('#10161b', 0.3),
  );
  recess.position.set(WATERSHED_SCREEN.x, WATERSHED_SCREEN.y, z + 0.002);
  group.add(recess);
  const glass = new Mesh(
    new RoundedBoxGeometry(
      WATERSHED_SCREEN.w,
      WATERSHED_SCREEN.h,
      0.003,
      2,
      0.004,
    ),
    t.paint('#0d1116', 0.05, 0.35),
  );
  glass.position.set(WATERSHED_SCREEN.x, WATERSHED_SCREEN.y, z + 0.005);
  group.add(glass);
  // Its POWER lamp, and a word as its model name for now (the mark later).
  const power = t.led(group, '#3cff5a', 0.004, 0.09, -0.05, z + 0.001);
  power.set(true);
  // Its printed face: the waves mark, the wordmark and the Chinese
  // subtitle along the bottom, as a Chinese-made instrument carries both.
  const brand = brandById(WATER_MARGIN);
  const face = t.printed(
    B.w - 0.03,
    B.h - 0.03,
    (c, cw, ch) => {
      const k = cw / (B.w - 0.03);
      c.fillStyle = '#2c3a44';
      c.fillRect(0, 0, cw, ch);
      // The screen's recess, darker round its opening.
      c.fillStyle = '#10161b';
      const sx =
        (WATERSHED_SCREEN.x -
          WATERSHED_SCREEN.w / 2 -
          0.012 +
          (B.w - 0.03) / 2) *
        k;
      const sy =
        ((B.h - 0.03) / 2 -
          WATERSHED_SCREEN.y -
          WATERSHED_SCREEN.h / 2 -
          0.012) *
        k;
      c.beginPath();
      c.roundRect(
        sx,
        sy,
        (WATERSHED_SCREEN.w + 0.024) * k,
        (WATERSHED_SCREEN.h + 0.024) * k,
        0.006 * k,
      );
      c.fill();
      // One bottom band, free below the screen: the mark at the left, two
      // lines of English beside it, and the Chinese subtitle to the right
      // (the owner, 2026-11-03).
      drawBrandMark(c, brand, cw * 0.075, ch * 0.8, ch * 0.075, '#2c3a44');
      c.fillStyle = '#dfe6ea';
      c.font = wordmarkFont(brand, ch * 0.045);
      c.textBaseline = 'middle';
      c.textAlign = 'left';
      c.fillText(brand.wordmark ?? brand.name, cw * 0.19, ch * 0.72);
      c.font = `bold ${ch * 0.025}px Arial, sans-serif`;
      c.fillText('POOL WATER CONTROLLER', cw * 0.19, ch * 0.84);
      c.fillStyle = '#9fb2bd';
      c.font = `${ch * 0.04}px "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif`;
      c.fillText('超级先进型水管理方案', cw * 0.62, ch * 0.8);
    },
    768,
  );
  face.mesh.position.set(0, 0, z + 0.001);
  group.add(face.mesh);
  // Cable glands along its foot.
  const gland = t.paint('#2a2d2e', 0.6);
  for (let i = 0; i < 7; i++)
    t.cyl(
      group,
      gland,
      0.009,
      0.018,
      -0.15 + i * 0.05,
      -B.h / 2 - 0.008,
      B.d / 2,
      'y',
      12,
    );
  // Its rating plate, on its right side, blank for now.
  const plate = t.box(
    group,
    t.paint('#e4e6e2', 0.7),
    0.001,
    0.05,
    0.09,
    B.w / 2 + 0.001,
    0,
    B.d / 2,
  );
  plate.name = `${tag} rating plate`;
  return group;
}
