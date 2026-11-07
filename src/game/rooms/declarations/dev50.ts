import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'dev50',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/truck-yard-room',
    start: 'startTruckYardRoom',
  },
});
