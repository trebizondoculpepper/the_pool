import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'dev16',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/water-room',
    start: 'startWaterRoom',
  },
});
