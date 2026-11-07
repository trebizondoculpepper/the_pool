import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'dev1',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/racks-room',
    start: 'startRacksRoom',
  },
});
