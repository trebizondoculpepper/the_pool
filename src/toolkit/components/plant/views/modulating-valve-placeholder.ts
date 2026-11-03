import { Group } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { beginPart } from '../../core/parts/parts';
import { tools } from '../../core/views/fitting-tools';
import { createBrandBadge } from '../../core/views/brand-badge';
import {
  newModulatingValve,
  stepModulatingValve,
} from '../logic/modulating-control';
import type { ModulatingValveState } from '../logic/modulating-control';

/**
 * A *placeholder* modulating control valve (the owner, 2026-11-03): the
 * finished valve will be a 2-port globe valve with a linear actuator and
 * its own sound; for now a plain, working stand-in so the controller loop
 * can be trialled. A short body between two flanges on a pipe, and above
 * it a small housing with a rising stem whose height shows the valve's
 * opening (0 shut to 1 fully open). It takes a command (0 to 1) and moves
 * to it over a finite stroke (`logic/modulating-control.ts`), as the
 * finished valve will.
 *
 * A real working component, never a static prop: it has state, is driven,
 * and shows what it is doing.
 */
export function createModulatingValvePlaceholder(
  kit: PanelKit,
  name: string,
  options: {
    /** The pipe's outside diameter, metres (its flanges' size). */
    od?: number;
    /** Where its command comes from, if not its own state. */
    command?: () => number;
    /** Its tag, printed on a small plaque. */
    tag?: string;
  } = {},
) {
  const a = beginPart(kit, name);
  const t = tools(kit);
  const od = options.od ?? 0.11;
  const body = t.paint('#8f969a', 0.5, 0.4);
  const flange = t.paint('#6f767a', 0.55, 0.5);
  const stem = t.paint('#c9cdd0', 0.35, 0.7);
  // Its body: a short spool between two flanges, its pipe along x.
  t.cyl(a.object, body, od / 2, 0.2, 0, 0, 0, 'x', 16);
  for (const x of [-0.11, 0.11])
    t.cyl(a.object, flange, od / 2 + 0.012, 0.02, x, 0, 0, 'x', 16);
  // Its housing above, and the rising stem that shows its opening.
  const housing = t.box(
    a.object,
    t.paint('#4c545a', 0.5, 0.4),
    0.09,
    0.06,
    0.09,
    0,
    od / 2 + 0.03,
    0,
  );
  housing.name = 'Actuator housing (placeholder)';
  const stemMesh = t.cyl(
    a.object,
    stem,
    0.008,
    0.12,
    0,
    od / 2 + 0.06,
    0,
    'y',
    12,
  );
  stemMesh.name = 'Rising stem (placeholder)';
  stemMesh.userData.live = true;
  const head = t.cyl(
    a.object,
    t.paint('#2e353a', 0.4),
    0.014,
    0.02,
    0,
    od / 2 + 0.13,
    0,
    'y',
    12,
  );
  head.name = 'Stem head (placeholder)';
  head.userData.live = true;
  if (options.tag) {
    const badge = createBrandBadge(kit, 'water-margin', { height: 0.016 });
    badge.position.set(0, od / 2 + 0.06, 0.05);
    a.object.add(badge);
  }
  // Its state: starts shut, held by its own command unless given one.
  let state: ModulatingValveState = newModulatingValve(30);
  if (options.command) state = { ...state, command: options.command() };
  const setPosition = (position: number) => {
    const lifted = position * 0.09;
    stemMesh.position.y = od / 2 + 0.06 + lifted;
    head.position.y = od / 2 + 0.13 + lifted;
  };
  a.updates.push((delta) => {
    if (options.command) state = { ...state, command: options.command() };
    state = stepModulatingValve(state, delta);
    setPosition(state.position);
  });
  setPosition(state.position);
  a.shows(() =>
    state.powered
      ? `${name}: ${Math.round(state.position * 100)}% open (asked ${Math.round(state.command * 100)}%)`
      : `${name}: no power`,
  );
  const part = a.part();
  return Object.assign(part, {
    /** The valve's state, for its owner to read. */
    state: () => state,
    /** Where its actuator's cable would leave, in its frame. */
    cableTail: new Group(),
  });
}
