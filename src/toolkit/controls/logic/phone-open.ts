import { signal } from '@preact/signals-core';

/** The handset has the controls while raised; the room and plant keep running. */
export const phoneOpen = signal(false);
