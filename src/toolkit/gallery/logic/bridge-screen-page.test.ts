import { describe, expect, it } from 'vite-plus/test';
import { BootScreen } from '../../../ui2d/boot';
import { Stack } from '../../../ui2d';
import { mountedPage, screenPage } from './bridge-screen-page';

describe('a bridge screen shows one page, chosen by its state (mission 124)', () => {
  it('maps each state to its one page', () => {
    expect(screenPage('unpowered')).toBe('black');
    expect(screenPage('off')).toBe('black');
    expect(screenPage('booting')).toBe('boot');
    expect(screenPage('running')).toBe('selected');
  });

  it("follows a screen's state as it goes off, boots and runs", () => {
    const screen = new BootScreen(new Stack('column', []));
    const page = () => screenPage(screen.displayState);
    expect(page()).toBe('selected');
    screen.setPower(false);
    expect(page()).toBe('black');
    screen.setPower(true);
    expect(page()).toBe('boot');
    screen.setSwitch(false);
    expect(page()).toBe('black');
    screen.setSwitch(true);
    expect(page()).toBe('boot');
    screen.skip();
    expect(page()).toBe('selected');
  });

  it('puts exactly one page on a console, never one over another', () => {
    for (const builtIn of [false, true])
      for (const chosen of [false, true])
        for (const alarms of [false, true]) {
          const m = mountedPage({ builtIn, chosen, alarms });
          // A screen with any page has exactly one on its surface.
          if (builtIn || chosen) expect(m).not.toBeNull();
          else expect(m).toBeNull();
        }
  });

  it('shows a page chosen for the viewscreen alone, without its own page behind it', () => {
    // The failure path: the viewscreen's own surface stayed in its holder
    // showing a black BLANK page under the chosen one (OUTSIDE CONDITIONS,
    // OLYMPIC FILTER WASHING), the two fighting for the depth test.
    expect(mountedPage({ builtIn: true, chosen: true, alarms: false })).toBe(
      'chosen',
    );
    expect(mountedPage({ builtIn: true, chosen: false, alarms: false })).toBe(
      'builtIn',
    );
  });

  it("shows the viewscreen's alarms instead of a chosen page", () => {
    expect(mountedPage({ builtIn: true, chosen: true, alarms: true })).toBe(
      'builtIn',
    );
  });

  it("shows a console's chosen page on its one surface", () => {
    expect(mountedPage({ builtIn: false, chosen: true, alarms: false })).toBe(
      'chosen',
    );
    // A console has no alarms page of its own: they never hide its page.
    expect(mountedPage({ builtIn: false, chosen: true, alarms: true })).toBe(
      'chosen',
    );
  });
});
