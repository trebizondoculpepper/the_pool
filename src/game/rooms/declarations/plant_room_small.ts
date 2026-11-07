import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'plant_room_small',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/plant-room-shell-room',
    start: 'startPlantRoomShell',
    args: ['small'],
  },
});
