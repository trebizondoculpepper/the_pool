import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'dev6',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/settling-room',
    start: 'startSettlingRoom',
  },
});
