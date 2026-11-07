import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'dev19d',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/plant-room',
    start: 'startEquipmentRoom',
    args: ['dev19d'],
  },
});
