import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'freight_lift',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/lift-rooms',
    start: 'startLiftCarRoom',
    args: ['freight'],
  },
});
