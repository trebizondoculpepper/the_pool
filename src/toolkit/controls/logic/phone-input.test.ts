import { describe, expect, it } from 'vite-plus/test';
import { createPhoneInbox, createPhoneMenu } from './phone-menu';
import {
  phoneDisplayTouch,
  phoneKeyAction,
  phoneKeyTouch,
} from './phone-input';

describe('raised phone input', () => {
  it('keeps walk and use keys out of the phone navigation map', () => {
    expect(phoneKeyAction('ArrowUp')).toBe('up');
    expect(phoneKeyAction('ArrowRight')).toBe('right');
    expect(phoneKeyAction('Enter')).toBe('select');
    for (const key of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE'])
      expect(phoneKeyAction(key)).toBeNull();
  });

  it('maps each drawn main row and an inbox row to its own item', () => {
    const menu = createPhoneMenu(
      createPhoneInbox([{ from: 'Plant', text: 'Pump report' }]),
    );
    for (const [index, y] of [164, 244, 324, 404].entries())
      expect(phoneDisplayTouch(menu.frame(), 200, y)).toEqual({ index });
    expect(phoneDisplayTouch(menu.frame(), 200, 204)).toBeNull();
    menu.tap(1);
    expect(phoneDisplayTouch(menu.frame(), 200, 150)).toEqual({ index: 0 });
    menu.tap(0);
    expect(phoneDisplayTouch(menu.frame(), 200, 150)).toEqual({ index: 0 });
    expect(phoneDisplayTouch(menu.frame(), 200, 470)).toEqual({
      action: 'select',
    });
    menu.tap(0);
    expect(phoneDisplayTouch(menu.frame(), 200, 60)).toBeNull();
    expect(phoneDisplayTouch(menu.frame(), 200, 150)).toEqual({
      action: 'up',
    });
    expect(phoneDisplayTouch(menu.frame(), 200, 400)).toEqual({
      action: 'down',
    });
    expect(phoneDisplayTouch(menu.frame(), 200, 470)).toBeNull();
    expect(phoneDisplayTouch(menu.frame(), 600, 150)).toBeNull();
    menu.action('back');
    menu.action('back');
    menu.action('back');
    menu.tap(2);
    expect(phoneDisplayTouch(menu.frame(), 200, 470)).toBeNull();
  });

  it('assigns the handset Navi, C and scroll regions', () => {
    expect(phoneKeyTouch(0, -0.04)).toEqual({ action: 'select' });
    expect(phoneKeyTouch(-0.29, -0.21)).toEqual({ action: 'back' });
    expect(phoneKeyTouch(0, -0.16)).toEqual({ action: 'up' });
    expect(phoneKeyTouch(-0.11, -0.23)).toEqual({ action: 'left' });
    expect(phoneKeyTouch(0.11, -0.23)).toEqual({ action: 'right' });
    expect(phoneKeyTouch(0, -0.29)).toEqual({ action: 'down' });
    expect(phoneKeyTouch(0.28, -0.21)).toBeNull();
    expect(phoneKeyTouch(0, -0.7)).toBeNull();
  });
});
