import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'dev57',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/dosing-console-room',
    start: 'startDosingConsoleRoom',
  },
});
