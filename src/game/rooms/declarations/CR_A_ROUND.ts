import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'CR_A_ROUND',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/dry-stair-room',
    start: 'startDryStairRoom',
  },
  sharesWorldWith: 'CR_A_UP',
  zoneWalk: true,
});
