import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'dev46',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/control-room-prototype',
    start: 'startBridgePrototype',
  },
});
