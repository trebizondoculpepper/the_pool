import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'plant_room_medium',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/plant-room-shell-room',
    start: 'startPlantRoomShell',
    args: ['medium'],
  },
});
