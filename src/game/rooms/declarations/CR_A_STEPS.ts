import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'CR_A_STEPS',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/arched-rooms',
    start: 'startArchedRooms',
  },
  sharesWorldWith: 'CR_A_ARCH',
  zoneWalk: true,
});
