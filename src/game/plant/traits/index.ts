/**
 * Every composite trait, sorted (mission 172): kept by `npm run audit --
 * trait define | rename | remove` with the files beside it, never by
 * hand. The files are gathered here so this file changes when they come
 * or go.
 */
export const TRAIT_IDS = [] as const;

export const TRAIT_FILES: Record<string, unknown> = import.meta.glob(
  ['./*.ts', '!./index.ts'],
  {
    eager: true,
    import: 'default',
  },
);
