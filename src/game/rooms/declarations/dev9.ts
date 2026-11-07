import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'dev9',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/fires-room',
    start: 'startFiresRoom',
  },
});
