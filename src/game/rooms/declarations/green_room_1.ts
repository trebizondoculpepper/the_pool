import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'green_room_1',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/white-corridor-room',
    start: 'startGreenRoom',
  },
  zoneWalk: true,
});
