import { signal } from '@preact/signals-core';
import { markComponent } from '../../core/views/component-identity';
import { beginPart } from '../../core/parts/parts';
import type { Part } from '../../core/parts/parts';
import { click, partAudio, recording } from '../../core/audio/part-audio';
import type { LoopRecipe, SoundRecipe } from '../../core/audio/part-audio';
import type { PanelKit } from '../../core/views/eighties-controls';
import type { TeleprinterView } from '../views/teleprinter';
import type { PrinterLamps } from '../logic/dot-matrix-printer';

/**
 * The MightyPrint 80's head printing: distinct 0.70-second excerpts of a
 * real Star LC-10 dot-matrix printer (Priwo's public-domain recording,
 * `CREDITS.md` and the audio asset record), shuffled so every variant is
 * used once per set and no two repeats are adjacent. One plays at each
 * printed line's start, not every frame.
 */
const LINE_SOUNDS: SoundRecipe[] = [1, 2, 3, 4, 5].map((i) =>
  recording(
    new URL(`../../core/audio/assets/printer-line-${i}.wav`, import.meta.url),
    0.11,
  ),
);

/** Every recorded line once per shuffled set, with no adjacent repeats. */
function createLineSoundPicker(random: () => number = Math.random) {
  let bag: number[] = [];
  let previous = -1;
  return () => {
    if (!bag.length) {
      bag = LINE_SOUNDS.map((_, index) => index);
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      // Selection removes the last item; keep set boundaries distinct too.
      const last = bag.length - 1;
      if (bag[last] === previous) [bag[0], bag[last]] = [bag[last], bag[0]];
    }
    previous = bag.pop()!;
    return LINE_SOUNDS[previous];
  };
}

/** Its paper-feed motor stepping the platen round. */
const PAPER_FEED: LoopRecipe = (context, out) => {
  const whirr = context.createOscillator();
  whirr.type = 'sawtooth';
  whirr.frequency.value = 220;
  const band = context.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 900;
  band.Q.value = 2;
  const level = context.createGain();
  level.gain.value = 0.018;
  whirr.connect(band).connect(level).connect(out);
  whirr.start();
  return [whirr];
};

/** Its small panel keys, and the rocker. */
const KEY = click({ band: 2600, q: 1.6, decay: 0.014, level: 0.28 });
const ROCKER = click({
  band: 1400,
  q: 1.2,
  decay: 0.03,
  level: 0.45,
  thump: [140, 0.03],
});

const LAMP_WORDS: Record<keyof PrinterLamps, string> = {
  power: 'POWER lamp',
  ready: 'READY lamp',
  paperOut: 'PAPER OUT lamp',
  online: 'ON LINE lamp',
};

/**
 * The MightyPrint 80's working parts: its ON LINE, FORM FEED and LINE FEED
 * buttons and its power rocker, each a use with its cue and description,
 * its four lamps described as they show, and its sounds (the head's rasp
 * while it prints, the feed motor while the paper moves). The printer's
 * own `update` runs the machine; this part only works it and voices it.
 */
export function mightyPrintParts(
  kit: PanelKit,
  printer: TeleprinterView,
  name = 'MightyPrint 80',
): Part {
  const a = beginPart(kit, name);
  const { machine, controls } = printer;
  a.shows(() => machine.describe());
  printer.group.add(a.object);
  const key = (
    object: (typeof controls)['online'],
    label: string,
    does: string,
    possible: () => boolean,
    act: () => void,
  ) => {
    markComponent(object, {
      part: { kind: 'local', label, does },
      key: `${a.object.uuid}:${label}`,
    });
    a.uses.set(object, () => {
      act();
      partAudio.play(KEY, object);
    });
    a.cue(object, () => ({ gesture: 'push', possible: possible() }));
  };
  key(
    controls.online,
    'ON LINE button',
    'Takes the printer on or off line. Off line it finishes its line, holds what it is sent in its 2 KB buffer, and its FORM FEED and LINE FEED work.',
    () => machine.power,
    () => {
      printer.press('online');
      machine.pressOnline();
    },
  );
  key(
    controls.formFeed,
    'FORM FEED button',
    'Off line only: feeds the paper to the top of the next form.',
    () => machine.canFeed,
    () => {
      printer.press('formFeed');
      machine.pressFormFeed();
    },
  );
  key(
    controls.lineFeed,
    'LINE FEED button',
    'Off line only: feeds the paper one line.',
    () => machine.canFeed,
    () => {
      printer.press('lineFeed');
      machine.pressLineFeed();
    },
  );
  markComponent(controls.power, {
    part: {
      kind: 'local',
      label: 'Power switch',
      does: 'Switches the printer on and off. Off, what its buffer holds is lost; on, it comes up on line.',
    },
    key: `${a.object.uuid}:power`,
  });
  a.uses.set(controls.power, () => {
    machine.setPower(!machine.power);
    partAudio.play(ROCKER, controls.power);
  });
  a.cue(controls.power, () => ({ gesture: 'push', possible: true }));
  for (const [lamp, mesh] of Object.entries(printer.lamps)) {
    const id = lamp as keyof PrinterLamps;
    markComponent(mesh, {
      part: {
        kind: 'visible',
        label: LAMP_WORDS[id],
        shows: () => (machine.lamps[id] ? 'lit' : 'dark'),
      },
      key: `${a.object.uuid}:${id}`,
    });
  }
  const feeding = signal(false);
  a.holdWhile(feeding, PAPER_FEED, printer.group);
  const pickLine = createLineSoundPicker();
  // One recorded line sound at each printed line's start (not every frame,
  // and not for the paper's own feeds, which the feed motor voices).
  let wasPrinting = false;
  a.updates.push(() => {
    feeding.value = machine.feeding;
    if (machine.printing && !wasPrinting)
      partAudio.play(pickLine(), printer.group);
    wasPrinting = machine.printing;
  });
  return a.part();
}
