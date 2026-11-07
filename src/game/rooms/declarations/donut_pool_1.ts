import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'donut_pool_1',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/donut-pool-room',
    start: 'startDonutPoolRoom',
  },
});
