import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'CR_A_ARCH',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/arched-rooms',
    start: 'startArchedRooms',
  },
  zoneWalk: true,
});
