import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'museum9',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/museum-hall-room',
    start: 'startMuseumHallRoom',
    args: ['museum9'],
  },
});
