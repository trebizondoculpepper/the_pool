import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'dev58',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/aqualis-controller-room',
    start: 'startAqualisControllerRoom',
  },
});
