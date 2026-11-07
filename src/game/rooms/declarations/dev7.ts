import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'dev7',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/tones-room',
    start: 'startTonesRoom',
  },
});
