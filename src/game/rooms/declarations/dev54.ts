import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'dev54',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/lift-rooms',
    start: 'startLiftCarRoom',
    args: ['trial'],
  },
});
