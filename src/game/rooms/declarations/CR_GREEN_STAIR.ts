import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'CR_GREEN_STAIR',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/white-corridor-room',
    start: 'startDiamondStairRoom',
  },
  zoneWalk: true,
});
