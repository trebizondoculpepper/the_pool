import type { World } from '../world';
import type { EventSource } from './event-sources';
import type { GameEvent } from './game-event';
import {
  ANNUNCIATOR_ALARMS,
  ALARM_TEXT,
} from '../../toolkit/gallery/logic/control-room-demo';
import {
  LOCATIONS,
  LOCATION_ANNUNCIATORS,
} from '../plant/location-annunciators';
import type { LocationId } from '../plant/location-annunciators';
import { registerLabel, shortName } from './register-label';
import { INFORMATIONAL_INDICATIONS } from '../health';

/**
 * Every annunciator window's alarm, as the log has it, in the valves'
 * words (`valve-events.ts`): the board's tag, its name and the window's
 * engraving from the model, then what happened: ALARM as the alarm comes
 * in, cleared as it goes, accepted as its window goes steady, reset as it
 * goes dark, and who where the world knows. A status window, ordinary
 * activity rather than a fault (`INFORMATIONAL_INDICATIONS`), logs ON and
 * OFF instead. The control room's board
 * (`annunciator.ts`) and each location's (`location-annunciators.ts`),
 * whose twins share one state, so each is logged once, under the board in
 * its own place where the register has one. Cheap: a reference comparison
 * when nothing changed. Pure.
 */

interface Windowed {
  windows: Readonly<Record<string, string>>;
  present: Readonly<Record<string, boolean>>;
}

interface Board {
  tag: string;
  name: string;
  alarms: readonly string[];
  /** Each window's engraving, its lines run together. */
  text: (id: string) => string;
  pick(w: World): Windowed;
}

const legend = (s: string) => s.replace(/\s*\n\s*/g, ' ');

const control = registerLabel(
  (room, kind) => room === 'control_room' && kind === 'annunciator',
);

/** A location's board: in its own place, or its twin in the control room. */
const locationLabel = (id: LocationId) =>
  registerLabel(
    (room, kind) => room !== 'control_room' && kind === `annunciator:${id}`,
  ) ??
  registerLabel((_room, kind) => kind === `annunciator:${id}`) ?? {
    tag: LOCATION_ANNUNCIATORS[id].tag,
    name: LOCATION_ANNUNCIATORS[id].name,
  };

const BOARDS: readonly Board[] = [
  {
    tag: control?.tag ?? 'annunciator',
    name: shortName(control?.name ?? 'Alarm annunciator'),
    alarms: ANNUNCIATOR_ALARMS.filter((id) => id !== 'spare'),
    text: (id) => legend(ALARM_TEXT[id as keyof typeof ALARM_TEXT].window),
    pick: (w) => w.annunciator,
  },
  ...LOCATIONS.map((id): Board => {
    const spec = LOCATION_ANNUNCIATORS[id];
    const label = locationLabel(id);
    return {
      tag: label.tag,
      name: shortName(label.name),
      alarms: spec.alarms.filter((a) => (spec.text[a] ?? '').trim() !== ''),
      text: (a) => legend(spec.text[a] ?? a),
      pick: (w) => w.locationAnnunciators[id],
    };
  }),
];

export const alarmEvents: EventSource = (before, after, cause, out) => {
  if (
    before.annunciator === after.annunciator &&
    before.locationAnnunciators === after.locationAnnunciators
  )
    return;
  for (const b of BOARDS) {
    const was = b.pick(before);
    const now = b.pick(after);
    if (was === now) continue;
    for (const id of b.alarms) {
      const line = (
        what: string,
        severity: GameEvent['severity'],
        by?: string,
      ): GameEvent => ({
        time: after.time,
        kind: 'plant',
        severity,
        subject: b.tag,
        text: `${b.name}, ${b.text(id)}: ${what}`,
        ...(by ? { by } : {}),
      });
      const p0 = was.present[id] ?? false;
      const p1 = now.present[id] ?? false;
      // A status window (MAKE-UP RUNNING: ordinary activity, never an
      // alarm; the owner, 2026-11-01) logs ON and OFF, and nothing for
      // its accepting or resetting.
      if (id in INFORMATIONAL_INDICATIONS) {
        if (!p0 && p1) out.push(line('ON', 'info'));
        if (p0 && !p1) out.push(line('OFF', 'info'));
        continue;
      }
      if (!p0 && p1) out.push(line('ALARM', 'alarm'));
      if (p0 && !p1) out.push(line('cleared', 'notice'));
      const w0 = was.windows[id] ?? 'off';
      const w1 = now.windows[id] ?? 'off';
      if (w0 === 'flashing' && w1 === 'steady')
        out.push(line('accepted', 'info', cause?.by));
      if (w0 !== 'off' && w1 === 'off')
        out.push(line('reset', 'info', cause?.by));
    }
  }
};
