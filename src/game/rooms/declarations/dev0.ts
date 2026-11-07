import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'dev0',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/controls-room',
    start: 'startControlsRoom',
  },
});
