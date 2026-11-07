import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'wet_hall',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/shell-room',
    start: 'startWetHall',
  },
});
