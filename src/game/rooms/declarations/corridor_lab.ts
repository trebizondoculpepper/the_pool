import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'corridor_lab',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/corridor-lab-room',
    start: 'startCorridorLabRoom',
  },
});
