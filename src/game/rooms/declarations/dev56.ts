import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'dev56',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/baked-ao-room',
    start: 'startBakedAoRoom',
  },
});
