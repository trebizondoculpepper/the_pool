/**
 * Every registered kind, one per line, sorted (mission 168): kept by
 * `npm run audit -- register` and `unregister` with the kind files beside
 * it, never by hand. A test fails if it and the directory disagree.
 */
export const KIND_IDS = [] as const;

export type FileKindId = (typeof KIND_IDS)[number];
