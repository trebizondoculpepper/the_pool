import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'dev35',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/jacuzzi-water-room',
    start: 'startJacuzziWaterRoom',
  },
});
