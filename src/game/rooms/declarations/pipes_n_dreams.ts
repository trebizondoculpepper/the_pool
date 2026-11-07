import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'pipes_n_dreams',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/pipes-n-dreams-room',
    start: 'startPipesRoom',
  },
});
