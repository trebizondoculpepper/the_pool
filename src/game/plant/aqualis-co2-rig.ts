import { CO2_PORT_IDS, setPortOpen } from './co2-distribution';
import type { Co2PortId } from './co2-distribution';
import {
  actOnCo2Doser,
  co2Feedback,
  resetCo2Doser,
  setCo2ManualRate,
  setCo2Mode,
} from './co2-dosing';
import type { Co2DoserMode, Co2PanelAction } from './co2-dosing';
import { newCo2Plant, stepCo2Plant } from './co2-plant';
import type { Co2Plant } from './co2-plant';
import { rigFlow, rigPorts, stepRig, withLineDose } from './aqualis-rig';
import type { Rig } from './aqualis-rig';
import type { ChannelId, ChannelPorts } from './aqualis-types';

/**
 * The Aqualis rig's CO₂ (dev58; the owner, 2026-11-01: "move the CO₂ dosing
 * controller into the Aqualis Trio dev room, and plumb it in there"): the
 * rig's ideal CO₂ valve is unplugged and the plant rooms' own CO₂ system
 * (`co2-plant.ts`) takes its place, the same model the world runs, so the
 * dev room's panels are the plant rooms' panels. Both stand side by
 * side, each on its own wall port off a small stand-in supply: the Lounge's
 * panel (`plant_pool_01`, its mass flow controller on 500 g/h) and the
 * Olympic's (`plant_pool_02`, on 2 kg/h). One of them at a time has its control cable
 * on the Trio's CO₂ port (`plugged`); the other's cable hangs free, so in
 * REMOTE it calls SIGNAL LOST, as a real one would. Both inject into the
 * rig's circulation at its injection point, through their non-return
 * valves: what they deliver goes into the rig's dosing line, with the
 * other channels', and on into the water while the loop runs. Pure.
 */

export interface RigCo2 {
  plant: Co2Plant;
  /** The panel whose control cable is on the Trio's CO₂ port. */
  plugged: Co2PortId;
  /** CO₂ delivered by each panel since the rig began, g. */
  grams: Record<Co2PortId, number>;
}

export const newRigCo2 = (plugged: Co2PortId = 'plant_pool_01'): RigCo2 => ({
  plant: newCo2Plant(20),
  plugged,
  grams: { plant_pool_01: 0, plant_pool_02: 0 },
});

/** The cabinet's control ports: the rig's pumps, and the plugged panel on CO₂. */
export function rigCo2Ports(rig: Rig, co2: RigCo2): ChannelPorts {
  return {
    ...rigPorts(rig),
    co2: co2Feedback(co2.plant.dosers[co2.plugged]),
  };
}

/**
 * The rig and its CO₂ `dt` seconds on, with the controller's demands: the
 * plugged panel gets the CO₂ demand, the other nothing on a free cable; the
 * panels' grams go into the rig's line before it steps; the rig's own ideal
 * CO₂ valve is asked for nothing.
 */
export function stepRigCo2(
  rig: Rig,
  co2: RigCo2,
  demands: Partial<Record<ChannelId, number>>,
  dt: number,
): { rig: Rig; co2: RigCo2 } {
  if (!(dt > 0)) return { rig, co2 };
  const waterFlowing = rigFlow(rig) > 0;
  const rooms = Object.fromEntries(
    CO2_PORT_IDS.map((id) => [
      id,
      {
        demand: id === co2.plugged ? (demands.co2 ?? 0) : 0,
        connected: id === co2.plugged,
        waterFlowing,
      },
    ]),
  ) as Parameters<typeof stepCo2Plant>[1]['rooms'];
  const step = stepCo2Plant(co2.plant, { rooms }, dt);
  const grams = step.grams.plant_pool_01 + step.grams.plant_pool_02;
  const dosed = grams > 0 ? withLineDose(rig, 'co2', grams) : rig;
  return {
    rig: stepRig(dosed, { ...demands, co2: 0 }, dt),
    co2: {
      ...co2,
      plant: step.state,
      grams: {
        plant_pool_01: co2.grams.plant_pool_01 + step.grams.plant_pool_01,
        plant_pool_02: co2.grams.plant_pool_02 + step.grams.plant_pool_02,
      },
    },
  };
}

// ---- What can be done to it -----------------------------------------------------

const withDoser = (
  co2: RigCo2,
  id: Co2PortId,
  f: (d: Co2Plant['dosers'][Co2PortId]) => Co2Plant['dosers'][Co2PortId],
): RigCo2 => ({
  ...co2,
  plant: {
    ...co2.plant,
    dosers: { ...co2.plant.dosers, [id]: f(co2.plant.dosers[id]) },
  },
});

/** A panel's REMOTE · MANUAL · OFF selector. */
export const setRigCo2Mode = (co2: RigCo2, id: Co2PortId, mode: Co2DoserMode) =>
  withDoser(co2, id, (d) => setCo2Mode(d, mode));

/** A panel's manual rate, g/h. */
export const setRigCo2Rate = (co2: RigCo2, id: Co2PortId, rate: number) =>
  withDoser(co2, id, (d) => setCo2ManualRate(d, rate));

/** Any of a panel's local controls (its mass flow controller's among them). */
export const actOnRigCo2 = (
  co2: RigCo2,
  id: Co2PortId,
  action: Co2PanelAction,
) => withDoser(co2, id, (d) => actOnCo2Doser(d, action));

/** RESET at a panel. */
export const resetRigCo2 = (co2: RigCo2, id: Co2PortId) =>
  withDoser(co2, id, resetCo2Doser);

/** A wall port's lever ball valve. */
export const setRigCo2Port = (
  co2: RigCo2,
  id: Co2PortId,
  open: boolean,
): RigCo2 => ({
  ...co2,
  plant: {
    ...co2.plant,
    distribution: setPortOpen(co2.plant.distribution, id, open),
  },
});

/** The Trio's CO₂ control cable moved to the other panel. */
export const plugRigCo2 = (co2: RigCo2, id: Co2PortId): RigCo2 =>
  co2.plugged === id ? co2 : { ...co2, plugged: id };
