import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'pool_03',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/pool-hall-room',
    start: 'startPoolHallRoom',
    args: ['pool_03'],
  },
});
