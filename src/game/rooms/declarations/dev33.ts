import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'dev33',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/pool-hall-room',
    start: 'startPoolHallRoom',
    args: [
      'pool_04',
      {
        devRoom: 'dev33',
      },
    ],
  },
});
