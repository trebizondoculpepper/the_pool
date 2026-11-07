import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'dev55',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/co2-cage-room',
    start: 'startCo2CageRoom',
  },
});
