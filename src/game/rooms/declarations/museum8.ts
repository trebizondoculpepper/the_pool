import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'museum8',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/museum-hall-room',
    start: 'startMuseumHallRoom',
    args: ['museum8'],
  },
});
