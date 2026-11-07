import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'dev3',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/architectural-room',
    start: 'startArchitecturalGalleryRoom',
  },
});
