import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'dev2',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/fittings-room',
    start: 'startFittingsRoom',
  },
});
