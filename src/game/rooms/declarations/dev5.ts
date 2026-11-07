import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'dev5',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/bin-room',
    start: 'startBinRoom',
  },
});
