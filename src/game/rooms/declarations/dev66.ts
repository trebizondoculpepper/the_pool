import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'dev66',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/plant-room',
    start: 'startEquipmentRoom',
    args: ['dev66'],
  },
});
