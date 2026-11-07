/** The small phone's menu and inbox. Pure data; rooms can deliver texts later. */

export interface PhoneMessage {
  id: number;
  text: string;
  from: string;
  read: boolean;
}

export function createPhoneInbox(
  samples: readonly { from: string; text: string }[] = [],
) {
  let nextId = 1;
  const messages: PhoneMessage[] = [];
  const listeners = new Set<(message: PhoneMessage) => void>();
  const receive = (from: string, text: string) => {
    const message = { id: nextId++, from, text, read: false };
    messages.unshift(message);
    for (const listener of listeners) listener(message);
    return message;
  };
  for (const sample of samples) receive(sample.from, sample.text);
  return {
    receive,
    subscribe(listener: (message: PhoneMessage) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    list: () => messages as readonly PhoneMessage[],
    unread: () => messages.filter((message) => !message.read).length,
    read(id: number) {
      const message = messages.find((item) => item.id === id);
      if (message) message.read = true;
      return message ?? null;
    },
  };
}

export const phoneInbox = createPhoneInbox([
  { from: 'Pool Plant', text: 'Here is the first message.' },
  { from: 'Pool Plant', text: 'Here is the second message.' },
  {
    from: 'Pool Plant',
    text: 'This is a longer sample message. Use the up and down controls to scroll through the text. Later, reports about the plant will arrive here while the game keeps running.',
  },
]);

export type PhonePage =
  | 'main'
  | 'messages'
  | 'inbox'
  | 'message'
  | 'placeholder';
export type PhoneAction = 'up' | 'down' | 'left' | 'right' | 'back' | 'select';

export interface PhoneFrame {
  page: PhonePage;
  title: string;
  rows: readonly string[];
  selected: number;
  body: readonly string[];
  unread: number;
  scroll: number;
  canScrollUp: boolean;
  canScrollDown: boolean;
}

/** Wrap the compact message display into lines, without splitting words. */
export function phoneLines(text: string, columns = 19): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (line && `${line} ${word}`.length > columns) {
      lines.push(line);
      line = '';
    }
    if (word.length > columns) {
      if (line) lines.push(line);
      for (let at = 0; at < word.length; at += columns)
        lines.push(word.slice(at, at + columns));
      line = '';
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}

export function createPhoneMenu(inbox = phoneInbox) {
  let page: PhonePage = 'main';
  let selected = 0;
  let messageId: number | null = null;
  let inboxSelectionId: number | null = null;
  let placeholder = '';
  let scroll = 0;
  const main = ['Phone', 'Messages', 'Media', 'Radio'];
  const currentMessage = () =>
    inbox.list().find((message) => message.id === messageId) ?? null;
  const inboxIndex = () =>
    Math.max(
      0,
      inbox.list().findIndex((message) => message.id === inboxSelectionId),
    );
  const rows = () =>
    page === 'main'
      ? main
      : page === 'messages'
        ? [`Inbox (${inbox.list().length})`]
        : page === 'inbox'
          ? inbox
              .list()
              .map(
                (message) =>
                  `${message.read ? ' ' : '●'} ${message.from}: ${message.text}`,
              )
          : [];
  const back = () => {
    if (page === 'main') return false;
    if (page === 'message') {
      page = 'inbox';
      inboxSelectionId = messageId;
      selected = inboxIndex();
    } else if (page === 'inbox') {
      page = 'messages';
      selected = 0;
    } else {
      selected = page === 'placeholder' ? main.indexOf(placeholder) : 1;
      page = 'main';
    }
    scroll = 0;
    return true;
  };
  const select = () => {
    if (page === 'main') {
      const choice = main[selected];
      if (choice === 'Messages') page = 'messages';
      else {
        placeholder = choice;
        page = 'placeholder';
      }
    } else if (page === 'messages') {
      page = 'inbox';
      inboxSelectionId = inbox.list()[0]?.id ?? null;
    } else if (page === 'inbox') {
      const message = inbox.list()[inboxIndex()];
      if (message) {
        messageId = message.id;
        inbox.read(message.id);
        page = 'message';
      }
    }
    selected = 0;
    scroll = 0;
  };
  return {
    open() {
      page = 'main';
      selected = 0;
      inboxSelectionId = null;
      scroll = 0;
    },
    action(action: PhoneAction): 'lower' | 'changed' {
      if (action === 'back') return back() ? 'changed' : 'lower';
      if (action === 'select') select();
      else if (page === 'message') {
        const count = phoneLines(currentMessage()?.text ?? '').length;
        scroll = Math.max(
          0,
          Math.min(
            Math.max(0, count - 8),
            scroll + (action === 'down' || action === 'right' ? 1 : -1),
          ),
        );
      } else {
        const count = rows().length;
        if (count) {
          selected =
            ((page === 'inbox' ? inboxIndex() : selected) +
              (action === 'down' || action === 'right' ? 1 : -1) +
              count) %
            count;
          if (page === 'inbox')
            inboxSelectionId = inbox.list()[selected]?.id ?? null;
        }
      }
      return 'changed';
    },
    tap(index: number) {
      if (!Number.isInteger(index) || index < 0 || index >= rows().length)
        return false;
      selected = index;
      if (page === 'inbox') inboxSelectionId = inbox.list()[index]?.id ?? null;
      select();
      return true;
    },
    frame(): PhoneFrame {
      const message = currentMessage();
      return {
        page,
        title:
          page === 'main'
            ? 'Menu'
            : page === 'message'
              ? (message?.from ?? 'Message')
              : page === 'placeholder'
                ? placeholder
                : page === 'inbox'
                  ? 'Inbox'
                  : 'Messages',
        rows: rows(),
        selected: page === 'inbox' ? inboxIndex() : selected,
        body:
          page === 'message'
            ? phoneLines(message?.text ?? '').slice(scroll, scroll + 8)
            : page === 'placeholder'
              ? ['Not available yet']
              : [],
        unread: inbox.unread(),
        scroll,
        canScrollUp: page === 'message' && scroll > 0,
        canScrollDown:
          page === 'message' &&
          scroll + 8 < phoneLines(message?.text ?? '').length,
      };
    },
  };
}
