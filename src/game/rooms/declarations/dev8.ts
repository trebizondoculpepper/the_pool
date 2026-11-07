import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'dev8',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/brands-room',
    start: 'startBrandsRoom',
  },
});
