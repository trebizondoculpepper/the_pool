import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'white_corridor_1',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/white-corridor-room',
    start: 'startWhiteCorridorRoom',
  },
  zoneWalk: true,
});
