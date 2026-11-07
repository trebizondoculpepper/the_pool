import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'dev4',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/repair-room',
    start: 'startRepairRoom',
  },
});
