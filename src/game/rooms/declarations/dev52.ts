import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'dev52',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/plant-room',
    start: 'startEquipmentRoom',
    args: ['dev52'],
  },
});
