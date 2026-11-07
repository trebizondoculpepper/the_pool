import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'dev67',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/plant-room',
    start: 'startEquipmentRoom',
    args: ['dev67'],
  },
});
