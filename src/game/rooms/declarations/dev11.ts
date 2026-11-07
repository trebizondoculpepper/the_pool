import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'dev11',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/pool-room',
    start: 'startPoolRoom',
  },
});
