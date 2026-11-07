import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'main_corridor',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/main-corridor-room',
    start: 'startMainCorridorRoom',
  },
});
