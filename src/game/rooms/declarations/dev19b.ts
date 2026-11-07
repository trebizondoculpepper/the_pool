import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'dev19b',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/plant-room',
    start: 'startEquipmentRoom',
    args: ['dev19b'],
  },
});
