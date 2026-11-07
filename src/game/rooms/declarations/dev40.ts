import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'dev40',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/plant-room',
    start: 'startEquipmentRoom',
    args: ['dev40'],
  },
});
