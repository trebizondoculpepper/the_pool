import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'tank_hall',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/tank-hall-room',
    start: 'startTankHall',
  },
});
