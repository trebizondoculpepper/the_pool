import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'dev45',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/control-room-prototype',
    start: 'startControlRoomPrototype',
  },
});
