/**
 * A 9-pin dot-matrix printer on endless fanfold paper, as the Gateway 3000
 * MightyPrint 80 works (after the Epson FX-80 of 1983; figures and sources
 * in `doc/research/mightyprint-80.md`). Pure logic: what it holds, where its
 * head and paper are, and what its lamps show.
 *
 * The host sends it lines. On line, it takes them from its input buffer one
 * at a time: the head seeks the nearer end of the line (bidirectional,
 * logic seeking), prints across it at 160 characters a second, and the
 * paper feeds one line. Its ON LINE button takes it off line, after the line
 * in hand: lines sent meanwhile wait in its 2 KB buffer and print when it
 * goes back on line; a line that will not fit is lost, and counted (the
 * alarm logger does not retry). Off line, and only then, FORM FEED runs the
 * paper to the top of the next form and LINE FEED feeds one line. Switched
 * off, the buffer (RAM) is lost; switched on, it is on line, its top of form
 * is where the paper stands, and its head makes its little dance home.
 * The stock is endless, so PAPER OUT never lights.
 */

export interface PrinterSpec {
  /** Columns a line holds (pica, 10 to the inch). */
  columns: number;
  /** Printing speed. */
  charsPerSecond: number;
  /** How much faster the head moves when it is not printing. */
  seekFactor: number;
  /** The input buffer, bytes; each line costs its length and CR LF. */
  bufferBytes: number;
  /** Lines to a form: 11 inches at 6 lines to the inch. */
  formLines: number;
  /** One line feed, seconds. */
  lineFeedSeconds: number;
  /** A line of a form feed's continuous run, seconds. */
  formFeedSecondsPerLine: number;
  /** The head's dance on switching on, seconds. */
  danceSeconds: number;
}

export const MIGHTYPRINT_80: PrinterSpec = {
  columns: 80,
  charsPerSecond: 160,
  seekFactor: 2,
  bufferBytes: 2048,
  formLines: 66,
  lineFeedSeconds: 0.15,
  formFeedSecondsPerLine: 0.05,
  danceSeconds: 0.8,
};

/** What the four lamps of its panel show. */
export interface PrinterLamps {
  power: boolean;
  ready: boolean;
  paperOut: boolean;
  online: boolean;
}

/** A line begun on the paper: the paper's line it is on, and its text. */
export interface PrintedRow {
  line: number;
  text: string;
}

type Job =
  | { kind: 'seek'; text: string; from: number; to: number }
  | { kind: 'print'; text: string; from: number; to: number }
  | { kind: 'feed'; lines: number; perLine: number; done: number };

/** Split a message into the lines it prints, `columns` wide, broken at spaces. */
export function wrapLines(message: string, columns: number): string[] {
  const out: string[] = [];
  for (const paragraph of message.split('\n')) {
    let line = paragraph.trimEnd();
    do {
      let end = Math.min(columns, line.length);
      if (line.length > columns) {
        const space = line.lastIndexOf(' ', columns);
        if (space > columns / 2) end = space;
      }
      out.push(line.slice(0, end));
      line = line.slice(end).trimStart();
    } while (line.length);
  }
  return out;
}

/** Bytes a line costs in the buffer: its characters and CR LF. */
const cost = (line: string) => line.length + 2;

export function createDotMatrixPrinter(spec: PrinterSpec = MIGHTYPRINT_80) {
  let power = true;
  let online = true;
  const buffer: string[] = [];
  let used = 0;
  let job: Job | null = null;
  /** The head, in columns from the left margin. */
  let head = 0;
  /** The paper fed since it was loaded, lines. */
  let paper = 0;
  /** The line of the form the paper stands at (0 at the top of form). */
  let lineInForm = 0;
  let lost = 0;
  let dance = 0;
  /** The last lines printed, for its description. */
  const history: string[] = [];

  const feed = (lines: number, perLine: number) => {
    job = { kind: 'feed', lines, perLine, done: 0 };
  };

  const machine = {
    spec,
    get power() {
      return power;
    },
    get online() {
      return power && online;
    },
    /** Lines waiting in the buffer. */
    get held() {
      return buffer.length;
    },
    /** Bytes of the buffer in use. */
    get bufferUsed() {
      return used;
    },
    /** Lines refused because the buffer was full or the power off. */
    get lost() {
      return lost;
    },
    /** The head's place across the line, 0 (left margin) to 1 (column 80). */
    get head() {
      return head / spec.columns;
    },
    /** The paper fed, lines (fractional while it moves). */
    get paper() {
      return paper;
    },
    get lineInForm() {
      return lineInForm;
    },
    /** Whether the head is printing a line. */
    get printing() {
      return job?.kind === 'print';
    },
    /** Whether the paper is moving. */
    get feeding() {
      return job?.kind === 'feed';
    },
    /** Whether anything is moving: a line, a feed, or the dance. */
    get busy() {
      return job !== null || dance > 0;
    },
    get lamps(): PrinterLamps {
      return {
        power,
        ready: power && online && used < spec.bufferBytes,
        paperOut: false,
        online: power && online,
      };
    },
    /** The last lines it printed, oldest first. */
    get history(): readonly string[] {
      return history;
    },
    /**
     * The host sends `message`: each of its lines goes into the buffer if
     * there is room, or is lost. Returns how many lines were taken.
     */
    send(message: string) {
      let taken = 0;
      for (const line of wrapLines(message, spec.columns)) {
        if (!power || used + cost(line) > spec.bufferBytes) {
          lost++;
          continue;
        }
        buffer.push(line);
        used += cost(line);
        taken++;
      }
      return taken;
    },
    /** ON LINE: on line or off it. Works whenever the power is on. */
    pressOnline() {
      if (!power) return false;
      online = !online;
      return true;
    },
    /** Whether FORM FEED and LINE FEED would do anything now. */
    get canFeed() {
      return power && !online && job === null && dance === 0;
    },
    /** FORM FEED: off line, to the top of the next form. */
    pressFormFeed() {
      if (!machine.canFeed) return false;
      feed(spec.formLines - lineInForm, spec.formFeedSecondsPerLine);
      return true;
    },
    /** LINE FEED: off line, one line. */
    pressLineFeed() {
      if (!machine.canFeed) return false;
      feed(1, spec.lineFeedSeconds);
      return true;
    },
    /** The power switch on its left side. */
    setPower(on: boolean) {
      if (on === power) return;
      power = on;
      if (on) {
        online = true;
        lineInForm = 0;
        dance = spec.danceSeconds;
      } else {
        buffer.length = 0;
        used = 0;
        // A line half printed stops where it is; a feed stops too.
        if (job?.kind === 'feed') paper = Math.round(paper);
        job = null;
        dance = 0;
      }
    },
    /**
     * Run `delta` seconds. Returns the lines begun meanwhile, each with the
     * paper's line it is printed on.
     */
    step(delta: number): PrintedRow[] {
      const started: PrintedRow[] = [];
      let left = Math.max(0, delta);
      while (left > 0 && power) {
        if (dance > 0) {
          const spent = Math.min(left, dance);
          dance -= spent;
          left -= spent;
          // Out to the middle and back home.
          const t = 1 - dance / spec.danceSeconds;
          head = Math.sin(t * Math.PI) * spec.columns * 0.4;
          if (dance === 0) head = 0;
          continue;
        }
        if (!job) {
          if (!online || !buffer.length) break;
          const text = buffer.shift()!;
          used -= cost(text);
          // Logic seeking: it prints from whichever end is nearer.
          const end = text.length;
          const forwards = Math.abs(head) <= Math.abs(head - end);
          job = {
            kind: 'seek',
            text,
            from: head,
            to: forwards ? 0 : end,
          };
        }
        if (job.kind === 'seek' || job.kind === 'print') {
          const speed =
            spec.charsPerSecond * (job.kind === 'seek' ? spec.seekFactor : 1);
          const distance = Math.abs(job.to - head);
          const time = distance / speed;
          if (time > left) {
            head += Math.sign(job.to - head) * left * speed;
            break;
          }
          head = job.to;
          left -= time;
          if (job.kind === 'seek') {
            const end = job.text.length;
            job = {
              kind: 'print',
              text: job.text,
              from: head,
              to: head === 0 ? end : 0,
            };
            started.push({ line: Math.round(paper), text: job.text });
            history.push(job.text);
            if (history.length > 8) history.shift();
          } else feed(1, spec.lineFeedSeconds);
          continue;
        }
        // Feeding.
        const remaining = (job.lines - job.done) * job.perLine;
        const time = Math.min(left, remaining);
        const lines = time / job.perLine;
        job.done += lines;
        paper += lines;
        left -= time;
        if (job.done >= job.lines - 1e-9) {
          paper = Math.round(paper);
          lineInForm = (lineInForm + job.lines) % spec.formLines;
          job = null;
        }
      }
      return started;
    },
    /** What it shows, in words, for the information overlay. */
    describe() {
      if (!power) return 'Off';
      const state = [
        online ? 'ON LINE' : 'off line',
        machine.printing
          ? 'printing'
          : machine.feeding
            ? 'feeding paper'
            : 'idle',
      ];
      if (buffer.length) state.push(`${buffer.length} lines held`);
      if (lost) state.push(`${lost} lost`);
      return state.join(', ');
    },
  };
  return machine;
}

export type DotMatrixPrinter = ReturnType<typeof createDotMatrixPrinter>;
