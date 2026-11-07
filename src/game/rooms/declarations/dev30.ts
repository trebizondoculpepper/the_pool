import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'dev30',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/plant-room',
    start: 'startEquipmentRoom',
    args: ['dev30'],
  },
});
