import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'dev34',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/shell-room',
    start: 'startStairTowerRoom',
  },
});
