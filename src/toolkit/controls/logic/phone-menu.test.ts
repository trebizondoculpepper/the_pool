import { describe, expect, it } from 'vite-plus/test';
import { createPhoneInbox, createPhoneMenu } from './phone-menu';

describe('the phone inbox', () => {
  it('shows the four main sections and resets there on each raise', () => {
    const menu = createPhoneMenu(createPhoneInbox());
    expect(menu.frame().rows).toEqual(['Phone', 'Messages', 'Media', 'Radio']);
    menu.action('select');
    expect(menu.frame().title).toBe('Phone');
    menu.open();
    expect(menu.frame().page).toBe('main');
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

  it('scrolls a long message four lines at a time and backs out level by level', () => {
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
    expect(menu.frame().body).toHaveLength(4);
    expect(menu.frame().scroll).toBeGreaterThan(0);
    expect(menu.action('back')).toBe('changed');
    expect(menu.action('back')).toBe('changed');
    expect(menu.action('back')).toBe('changed');
    expect(menu.action('back')).toBe('lower');
  });
});
