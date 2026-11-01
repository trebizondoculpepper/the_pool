import type { World } from '../world';
import type { GameEvent } from './game-event';
import type { EventSource } from './event-sources';
import { MOTOR_TAGS, MOTORS } from '../plant/motor-starters';
import { registerLabel, shortName } from './register-label';

/**
 * Every pump starting and stopping, as the log has it, in the valves'
 * words (`valve-events.ts`): its tag, its name from the register, STARTED
 * or STOPPED, and who where the world knows. The pools' circulation pumps
 * by their starters (named by their pump set: 'Olympic pool circulation
 * pumps, duty'), the wet hall's make-up booster set by its run. Trips stay
 * with the watchers (`watchers.ts`). Cheap: a reference comparison when
 * nothing changed. Pure.
 */

interface Pump {
  tag: string;
  name: string;
  running(w: World): boolean;
  /** Who started or stopped it in a step: its starter, or the make-up's AUTO. */
  auto: string;
}

const PUMPS: readonly Pump[] = [
  ...MOTOR_TAGS.map((tag): Pump => {
    const { pool, role } = MOTORS[tag];
    const set = registerLabel(
      (room, kind) => room === `plant_${pool}` && kind === 'pump-pair',
    );
    return {
      tag,
      name: `${set ? shortName(set.name) : tag}, ${role}`,
      running: (w) => w.motors.starters[tag].running,
      auto: 'its starter',
    };
  }),
  ...[
    registerLabel(
      (room, kind) => room === 'wet_hall' && kind === 'booster-set',
    ),
  ]
    .filter((l) => l !== undefined)
    .map((l): Pump => ({
      tag: l.tag,
      name: shortName(l.name),
      running: (w) => w.wetHall.boosterRunning,
      auto: 'AUTO, make-up demand',
    })),
];

export const pumpEvents: EventSource = (before, after, cause, out) => {
  if (before.motors === after.motors && before.wetHall === after.wetHall)
    return;
  for (const p of PUMPS) {
    const now = p.running(after);
    if (p.running(before) === now) continue;
    const by = cause?.by ?? p.auto;
    const e: GameEvent = {
      time: after.time,
      kind: 'plant',
      severity: 'info',
      subject: p.tag,
      text: `${p.name}: ${now ? 'STARTED' : 'STOPPED'}`,
      by,
    };
    out.push(e);
  }
};
