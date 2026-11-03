import { Group } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { createMicroLabel } from '../../core/views/eighties-controls';

/**
 * A *placeholder* thermal probe (the owner, 2026-11-03): the finished
 * probe will be a proper Pt100 pocket probe with a screened lead gland;
 * for now a plain stand-in so the controller loop can be trialled — a
 * short stem into a pocket with a small head, labelled with its tag. It
 * reports the pipe's temperature to the controller.
 *
 * A real working component: it carries the measured value and shows it.
 */
export function createThermalProbePlaceholder(
  kit: PanelKit,
  tag: string,
  options: {
    /** The pipe's outside diameter, metres. */
    pipeOd?: number;
    /** Where the measured temperature comes from. */
    read?: () => number;
  } = {},
) {
  const t = tools(kit);
  const group = new Group();
  group.name = `${tag} thermal probe (placeholder)`;
  const pipeOd = options.pipeOd ?? 0.11;
  const stainless = t.paint('#aeb5b5', 0.55, 0.7);
  const head = t.paint('#aeb7b2', 0.45, 0.2);
  const radius = pipeOd / 2;
  t.cyl(group, stainless, 0.012, 0.04, 0, 0, radius + 0.01, 'z', 12);
  t.cyl(group, stainless, 0.006, 0.09, 0, 0, radius + 0.06, 'z', 10);
  t.box(group, head, 0.06, 0.05, 0.04, 0, 0, radius + 0.13);
  const label = createMicroLabel(kit, `${tag}  Pt100`, {
    height: 0.009,
    ink: '#182027',
    maxWidth: 0.07,
  });
  label.position.set(0, -0.031, radius + 0.152);
  group.add(label);
  return {
    group,
    /** Where its screen leads leave, in its frame. */
    cableTail: new Group(),
    /** The temperature it reports, °C, read from the pipe each step. */
    read: options.read ?? (() => 20),
  };
}
