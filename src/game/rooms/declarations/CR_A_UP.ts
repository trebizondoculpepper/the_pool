import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'CR_A_UP',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/dry-stair-room',
    start: 'startDryStairRoom',
  },
  zoneWalk: true,
});
