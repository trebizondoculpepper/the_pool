/**
 * The bench index's page registry (mission 137, `doc/plans/137-bench-index.md`):
 * every development page says once which branch of the index it belongs to
 * and how to make its link, so a new page (138's simulation pages, 134's
 * plant report, the next audit) joins the index by registering. Pure: no DOM.
 */

/** The index's top-level branches, in the order they are shown. */
export const BRANCHES = [
  'rooms',
  'things',
  'brands',
  'simulation',
  'tools',
] as const;
export type Branch = (typeof BRANCHES)[number];

export const BRANCH_WORDS: Record<Branch, string> = {
  rooms: 'Rooms',
  things: 'Things',
  brands: 'Brands',
  simulation: 'Simulation',
  tools: 'Tools',
};

/** What a page is about: one room, one kind, one brand, or nothing (a page of its own). */
export type PageSubject = 'room' | 'kind' | 'brand' | 'none';

/** A row a page offers under its branch (138's node list, say): data only. */
export interface RegisteredRow {
  id: string;
  label: string;
  href?: string;
  meta?: string;
  /** Extra search words. */
  fields?: readonly string[];
  children?: readonly RegisteredRow[];
}

export interface PageEntry {
  /** Unique, stable: the page's `bench=` value where it has one. */
  id: string;
  /** What the index shows. */
  name: string;
  branch: Branch;
  subject: PageSubject;
  /** Its link; `subject` is the room, kind or brand id, or '' for `none`. */
  link: (subject: string) => string;
  /** Whether it applies to this subject (a magic page only where it helps, say); all by default. */
  applies?: (subject: string) => boolean;
  /** For a `none` page: rows to list under it, built only when it is opened. */
  rows?: () => readonly RegisteredRow[] | Promise<readonly RegisteredRow[]>;
}

const pages = new Map<string, PageEntry>();

/** Register a page; registering the same id again replaces it. */
export function registerPage(entry: PageEntry): void {
  pages.set(entry.id, entry);
}

/** Every registered page, in registration order. */
export const registeredPages = (): readonly PageEntry[] => [...pages.values()];

/** The pages of one branch about one sort of subject. */
export const pagesFor = (
  branch: Branch,
  subject: PageSubject,
  id = '',
): readonly PageEntry[] =>
  registeredPages().filter(
    (p) =>
      p.branch === branch && p.subject === subject && (p.applies?.(id) ?? true),
  );

/** The branches with at least one page; Rooms, Things and Brands always. */
export const branchesInUse = (): readonly Branch[] =>
  BRANCHES.filter(
    (b) =>
      b === 'rooms' ||
      b === 'things' ||
      b === 'brands' ||
      registeredPages().some((p) => p.branch === b),
  );

/** For tests: forget every page. */
export const clearPages = () => pages.clear();
