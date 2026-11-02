import { describe, expect, it } from 'vite-plus/test';
import {
  MIGHTYPRINT_80,
  createDotMatrixPrinter,
  wrapLines,
} from './dot-matrix-printer';

/** Run a printer until nothing moves, `step` seconds at a time. */
const settle = (
  printer: ReturnType<typeof createDotMatrixPrinter>,
  step = 0.05,
) => {
  const rows = [];
  for (let i = 0; i < 20000 && printer.busy; i++)
    rows.push(...printer.step(step));
  for (let i = 0; i < 20000; i++) {
    const begun = printer.step(step);
    rows.push(...begun);
    if (!printer.busy && !begun.length) break;
  }
  return rows;
};

describe('the MightyPrint 80', () => {
  it('starts on line, ready, with POWER, READY and ON LINE lit and PAPER OUT dark', () => {
    const printer = createDotMatrixPrinter();
    expect(printer.lamps).toEqual({
      power: true,
      ready: true,
      paperOut: false,
      online: true,
    });
  });

  it('prints each line sent on the next line of paper, feeding a line after it', () => {
    const printer = createDotMatrixPrinter();
    printer.send('07:42 ALARM CL LOW');
    printer.send('07:43 ACCEPT');
    const rows = settle(printer);
    expect(rows).toEqual([
      { line: 0, text: '07:42 ALARM CL LOW' },
      { line: 1, text: '07:43 ACCEPT' },
    ]);
    expect(printer.paper).toBe(2);
    expect(printer.lineInForm).toBe(2);
  });

  it('prints at 160 characters a second, the head crossing the line', () => {
    const printer = createDotMatrixPrinter();
    printer.send('X'.repeat(80));
    printer.step(0.001);
    expect(printer.printing).toBe(true);
    printer.step(0.25);
    expect(printer.head).toBeCloseTo(0.5, 1);
    printer.step(0.26);
    expect(printer.printing).toBe(false);
    expect(printer.feeding).toBe(true);
  });

  it('seeks the nearer end: a second line prints right to left', () => {
    const printer = createDotMatrixPrinter();
    printer.send('A'.repeat(40));
    printer.send('B'.repeat(40));
    settle(printer);
    // The second line began where the first ended, and came home.
    expect(printer.head).toBe(0);
    printer.send('C'.repeat(60));
    printer.step(0.2);
    expect(printer.head).toBeGreaterThan(0);
  });

  it('wraps long messages at a space within its 80 columns', () => {
    const lines = wrapLines(`${'WORD '.repeat(30)}END`, 80);
    for (const line of lines) expect(line.length).toBeLessThanOrEqual(80);
    expect(lines.join(' ').replace(/\s+/g, ' ')).toBe(
      `${'WORD '.repeat(30)}END`.replace(/\s+/g, ' '),
    );
  });

  it('off line, holds what it is sent and prints it when back on line', () => {
    const printer = createDotMatrixPrinter();
    expect(printer.pressOnline()).toBe(true);
    expect(printer.lamps.online).toBe(false);
    expect(printer.lamps.ready).toBe(false);
    printer.send('HELD ONE');
    printer.send('HELD TWO');
    expect(settle(printer)).toEqual([]);
    expect(printer.held).toBe(2);
    printer.pressOnline();
    expect(settle(printer).map((r) => r.text)).toEqual([
      'HELD ONE',
      'HELD TWO',
    ]);
    expect(printer.held).toBe(0);
  });

  it('loses what will not fit in its 2 KB buffer, and says so', () => {
    const printer = createDotMatrixPrinter();
    printer.pressOnline();
    for (let i = 0; i < 40; i++) printer.send('Y'.repeat(78));
    // 80 bytes a line: 25 lines fill 2000 of its 2048 bytes.
    expect(printer.held).toBe(25);
    expect(printer.lost).toBe(15);
    expect(printer.bufferUsed).toBeLessThanOrEqual(MIGHTYPRINT_80.bufferBytes);
  });

  it('finishes the line in hand when taken off line', () => {
    const printer = createDotMatrixPrinter();
    printer.send('FIRST');
    printer.send('SECOND');
    const begun = printer.step(0.01);
    printer.pressOnline();
    expect([...begun, ...settle(printer)].map((r) => r.text)).toEqual([
      'FIRST',
    ]);
    expect(printer.held).toBe(1);
  });

  it('feeds only off line: LINE FEED a line, FORM FEED to the next top of form', () => {
    const printer = createDotMatrixPrinter();
    expect(printer.pressLineFeed()).toBe(false);
    expect(printer.pressFormFeed()).toBe(false);
    printer.pressOnline();
    expect(printer.pressLineFeed()).toBe(true);
    settle(printer);
    expect(printer.paper).toBe(1);
    expect(printer.pressFormFeed()).toBe(true);
    settle(printer);
    expect(printer.paper).toBe(66);
    expect(printer.lineInForm).toBe(0);
  });

  it('switched off, goes dark, loses its buffer and refuses lines; on again, it dances and is on line', () => {
    const printer = createDotMatrixPrinter();
    printer.pressOnline();
    printer.send('LOST WITH THE POWER');
    printer.setPower(false);
    expect(printer.lamps).toEqual({
      power: false,
      ready: false,
      paperOut: false,
      online: false,
    });
    expect(printer.held).toBe(0);
    expect(printer.send('NOBODY HOME')).toBe(0);
    expect(printer.pressOnline()).toBe(false);
    printer.setPower(true);
    expect(printer.online).toBe(true);
    expect(printer.busy).toBe(true);
    printer.step(0.4);
    expect(printer.head).toBeGreaterThan(0);
    settle(printer);
    expect(printer.head).toBe(0);
  });

  it('describes what it is doing in words', () => {
    const printer = createDotMatrixPrinter();
    expect(printer.describe()).toBe('ON LINE, idle');
    printer.pressOnline();
    printer.send('ONE');
    expect(printer.describe()).toBe('off line, idle, 1 lines held');
  });
});
