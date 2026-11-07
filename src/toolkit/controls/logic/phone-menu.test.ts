import { describe, expect, it } from 'vite-plus/test';
import { createPhoneInbox, createPhoneMenu } from './phone-menu';

describe('the phone inbox', () => {
  it('announces only live deliveries to current subscribers', () => {
    const inbox = createPhoneInbox([{ from: 'Plant', text: 'Sample' }]);
    const heard: string[] = [];
    const unsubscribe = inbox.subscribe((message) => heard.push(message.text));
    expect(heard).toEqual([]);
    inbox.receive('Plant', 'First live report');
    expect(heard).toEqual(['First live report']);
    unsubscribe();
    inbox.receive('Plant', 'Later report');
    expect(heard).toEqual(['First live report']);
  });

  it('shows the four main sections and resets there on each raise', () => {
    const menu = createPhoneMenu(createPhoneInbox());
    expect(menu.frame().rows).toEqual(['Phone', 'Messages', 'Media', 'Radio']);
    menu.action('select');
    expect(menu.frame().title).toBe('Phone');
    menu.open();
    expect(menu.frame().page).toBe('main');
  });

  it('uses one vertical selection and restores its parent item on back', () => {
    const menu = createPhoneMenu(createPhoneInbox());
    menu.action('down');
    expect(menu.frame().selected).toBe(1);
    menu.action('select');
    expect(menu.frame().page).toBe('messages');
    menu.action('back');
    expect(menu.frame().page).toBe('main');
    expect(menu.frame().selected).toBe(1);
    menu.action('right');
    expect(menu.frame().selected).toBe(2);
    menu.action('select');
    expect(menu.frame().title).toBe('Media');
    menu.action('back');
    expect(menu.frame().selected).toBe(2);
  });

  it('keeps new messages first and marks only the opened one read', () => {
    const inbox = createPhoneInbox([
      { from: 'Plant', text: 'First' },
      { from: 'Plant', text: 'Second' },
    ]);
    const menu = createPhoneMenu(inbox);
    menu.action('down'); // Messages
    menu.action('select');
    menu.action('select'); // Inbox
    expect(menu.frame().rows[0]).toContain('Second');
    menu.action('select');
    expect(menu.frame().body).toEqual(['Second']);
    expect(inbox.unread()).toBe(1);
    menu.action('back');
    expect(menu.frame().rows[0]).toMatch(/^ {2}Plant/);
    inbox.receive('Plant', 'Third');
    expect(menu.frame().rows[0]).toContain('Third');
  });

  it('keeps the highlighted inbox message when a new one arrives above it', () => {
    const inbox = createPhoneInbox([
      { from: 'Plant', text: 'First' },
      { from: 'Plant', text: 'Second' },
    ]);
    const menu = createPhoneMenu(inbox);
    menu.action('down');
    menu.action('select');
    menu.action('select');
    menu.action('down'); // First
    expect(menu.frame().rows[menu.frame().selected]).toContain('First');
    inbox.receive('Plant', 'Third');
    expect(menu.frame().selected).toBe(2);
    expect(menu.frame().rows[menu.frame().selected]).toContain('First');
    menu.action('select');
    expect(menu.frame().body).toEqual(['First']);
    menu.action('back');
    expect(menu.frame().rows[menu.frame().selected]).toContain('First');
  });

  it('opens the touched icon and inbox row without acting on empty space', () => {
    const menu = createPhoneMenu(
      createPhoneInbox([{ from: 'Plant', text: 'Pump report' }]),
    );
    expect(menu.tap(4)).toBe(false);
    expect(menu.tap(1)).toBe(true);
    expect(menu.frame().page).toBe('messages');
    expect(menu.tap(0)).toBe(true);
    expect(menu.frame().page).toBe('inbox');
    expect(menu.tap(0)).toBe(true);
    expect(menu.frame().body).toEqual(['Pump report']);
  });

  it('scrolls a long message eight bitmap lines at a time and backs out level by level', () => {
    const inbox = createPhoneInbox([
      {
        from: 'Plant',
        text: 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen '.repeat(
          3,
        ),
      },
    ]);
    const menu = createPhoneMenu(inbox);
    menu.action('down');
    menu.action('select');
    menu.action('select');
    menu.action('select');
    expect(menu.frame().scroll).toBe(0);
    for (let i = 0; i < 10; i++) menu.action('down');
    expect(menu.frame().body).toHaveLength(8);
    expect(menu.frame().scroll).toBeGreaterThan(0);
    expect(menu.frame().canScrollUp).toBe(true);
    for (let i = 0; i < 100; i++) menu.action('down');
    expect(menu.frame().canScrollDown).toBe(false);
    expect(menu.action('back')).toBe('changed');
    expect(menu.action('back')).toBe('changed');
    expect(menu.action('back')).toBe('changed');
    expect(menu.action('back')).toBe('lower');
  });
});
