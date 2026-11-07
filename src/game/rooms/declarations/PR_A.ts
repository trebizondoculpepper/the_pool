import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'PR_A',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/pool-room',
    start: 'startPoolRoom',
    args: ['PR_A'],
  },
  zoneWalk: true,
});
