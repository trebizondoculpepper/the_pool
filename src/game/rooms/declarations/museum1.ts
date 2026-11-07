import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'museum1',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/museum-hall-room',
    start: 'startMuseumHallRoom',
    args: ['museum1'],
  },
});
