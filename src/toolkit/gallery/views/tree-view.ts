import type { IndexNode } from '../logic/bench-index';

/**
 * One expandable tree (mission 137): `role="tree"` semantics with a roving
 * tabindex. Up and Down move, Right opens or steps in (or reaches a leaf's
 * secondary links), Left closes or steps out, Home and End, Enter follows
 * the focused link. A branch's rows are drawn only when it is opened.
 * Shared by the bench index (and, later, `?dev`'s
 * catalogue).
 */

export interface TreeView {
  element: HTMLElement;
  /** Draw these nodes, opening the given paths. */
  render(nodes: readonly IndexNode[], open: ReadonlySet<string>): void;
  /** Open the way to a path and focus it; false if it is not in the tree. */
  reveal(path: string): boolean;
}

export interface TreeOptions {
  label: string;
  onToggle?: (path: string, open: boolean) => void;
}

const STYLE = `
.tree{list-style:none;margin:0;padding:0;font:14px/1.5 sans-serif}
.tree ul{list-style:none;margin:0;padding:0 0 0 18px}
.tree [role=treeitem]{outline:none}
.tree .tree-row{display:flex;gap:8px;align-items:baseline;padding:1px 6px;border-radius:3px;cursor:default}
.tree [role=treeitem]:focus>.tree-row{background:#3a3f46;box-shadow:inset 0 0 0 1px #c9b26b}
.tree .tree-twist{width:1em;display:inline-block;color:#c9b26b;cursor:pointer}
.tree .tree-count,.tree .tree-meta{color:#9a937e;font-size:12px}
.tree a{color:#9cc7ff}
.tree .tree-links a{margin-left:6px;font-size:12px}
`;

export function createTreeView(options: TreeOptions): TreeView {
  if (!document.querySelector('style[data-tree-view]')) {
    const s = document.createElement('style');
    s.dataset.treeView = '';
    s.textContent = STYLE;
    document.head.append(s);
  }
  const root = document.createElement('ul');
  root.className = 'tree';
  root.setAttribute('role', 'tree');
  root.setAttribute('aria-label', options.label);
  let openSet = new Set<string>();

  const items = () =>
    [...root.querySelectorAll<HTMLElement>('[role=treeitem]')].filter(
      (li) => !li.parentElement?.closest('[hidden]'),
    );

  const focus = (li: HTMLElement | undefined) => {
    if (!li) return;
    for (const other of root.querySelectorAll<HTMLElement>('[tabindex="0"]'))
      other.tabIndex = -1;
    li.tabIndex = 0;
    li.focus();
  };

  const setOpen = (li: HTMLElement, open: boolean) => {
    const group = li.querySelector<HTMLElement>(':scope > ul');
    if (!group) return;
    const path = li.dataset.path!;
    if (open && !group.dataset.built) {
      const make = (li as HTMLElement & { make?: () => readonly IndexNode[] })
        .make;
      for (const n of make?.() ?? []) group.append(item(n, path));
      group.dataset.built = '1';
    }
    group.hidden = !open;
    li.setAttribute('aria-expanded', String(open));
    li.querySelector(':scope > .tree-row > .tree-twist')!.textContent = open
      ? '▾'
      : '▸';
    const count = li.querySelector<HTMLElement>(
      ':scope > .tree-row > .tree-count',
    );
    if (count) count.hidden = open;
    if (open) openSet.add(path);
    else openSet.delete(path);
    options.onToggle?.(path, open);
  };

  function item(n: IndexNode, base: string): HTMLElement {
    const path = base ? `${base}/${n.id}` : n.id;
    const li = document.createElement('li');
    li.setAttribute('role', 'treeitem');
    li.tabIndex = -1;
    li.dataset.path = path;
    const row = document.createElement('div');
    row.className = 'tree-row';
    const twist = document.createElement('span');
    twist.className = 'tree-twist';
    twist.textContent = n.children ? '▸' : '';
    row.append(twist);
    if (n.href) {
      const a = document.createElement('a');
      a.href = n.href;
      a.textContent = n.label;
      a.tabIndex = -1;
      row.append(a);
    } else {
      const s = document.createElement('span');
      s.textContent = n.label;
      row.append(s);
    }
    if (n.meta) {
      const m = document.createElement('span');
      m.className = 'tree-meta';
      m.textContent = n.meta;
      row.append(m);
    }
    if (n.links?.length) {
      const links = document.createElement('span');
      links.className = 'tree-links';
      for (const l of n.links) {
        const a = document.createElement('a');
        a.href = l.href;
        a.textContent = l.label;
        a.tabIndex = -1;
        links.append(a);
      }
      row.append(links);
    }
    if (n.count && n.children) {
      const c = document.createElement('span');
      c.className = 'tree-count';
      c.textContent = `(${n.count})`;
      row.append(c);
    }
    li.append(row);
    if (n.children) {
      li.setAttribute('aria-expanded', 'false');
      (li as HTMLElement & { make?: () => readonly IndexNode[] }).make =
        n.children;
      const group = document.createElement('ul');
      group.setAttribute('role', 'group');
      group.hidden = true;
      li.append(group);
      if (openSet.has(path)) setOpen(li, true);
    }
    row.addEventListener('click', (e) => {
      focus(li);
      if ((e.target as HTMLElement).closest('a')) return;
      if (n.children) setOpen(li, li.getAttribute('aria-expanded') !== 'true');
    });
    return li;
  }

  root.addEventListener('keydown', (e) => {
    const li = (e.target as HTMLElement).closest<HTMLElement>(
      '[role=treeitem]',
    );
    if (!li) return;
    const list = items();
    const i = list.indexOf(li);
    const expanded = li.getAttribute('aria-expanded');
    const parent = li.parentElement?.closest<HTMLElement>('[role=treeitem]');
    const links = [
      ...li.querySelectorAll<HTMLAnchorElement>(
        ':scope > .tree-row > .tree-links a',
      ),
    ];
    const linkIndex = links.indexOf(e.target as HTMLAnchorElement);
    switch (e.key) {
      case 'ArrowDown':
        focus(list[i + 1]);
        break;
      case 'ArrowUp':
        focus(list[i - 1]);
        break;
      case 'Home':
        focus(list[0]);
        break;
      case 'End':
        focus(list[list.length - 1]);
        break;
      case 'ArrowRight':
        if (expanded === 'false') setOpen(li, true);
        else if (expanded === 'true') focus(items()[i + 1]);
        else links[linkIndex + 1]?.focus();
        break;
      case 'ArrowLeft':
        if (linkIndex > 0) links[linkIndex - 1]?.focus();
        else if (linkIndex === 0) focus(li);
        else if (expanded === 'true') setOpen(li, false);
        else focus(parent ?? undefined);
        break;
      case 'Escape':
        if (linkIndex < 0) return;
        focus(li);
        break;
      case 'Enter': {
        if (linkIndex >= 0) {
          links[linkIndex]!.click();
          break;
        }
        const a = li.querySelector<HTMLAnchorElement>(':scope > .tree-row > a');
        if (a) a.click();
        else if (expanded) setOpen(li, expanded !== 'true');
        break;
      }
      default:
        return;
    }
    e.preventDefault();
  });

  return {
    element: root,
    render(nodes, open) {
      openSet = new Set(open);
      root.replaceChildren(...nodes.map((n) => item(n, '')));
      const first = root.querySelector<HTMLElement>('[role=treeitem]');
      if (first) first.tabIndex = 0;
    },
    reveal(path) {
      const segs = path.split('/');
      let li: HTMLElement | undefined;
      for (let k = 1; k <= segs.length; k++) {
        const p = segs.slice(0, k).join('/');
        li = [...root.querySelectorAll<HTMLElement>('[role=treeitem]')].find(
          (x) => x.dataset.path === p,
        );
        if (!li) return false;
        if (k < segs.length) setOpen(li, true);
      }
      if (!li) return false;
      if (li.getAttribute('aria-expanded') === 'false') setOpen(li, true);
      focus(li);
      li.scrollIntoView({ block: 'start' });
      return true;
    },
  };
}
