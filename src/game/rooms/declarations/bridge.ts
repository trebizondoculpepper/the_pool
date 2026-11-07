import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'bridge',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/bridge-room',
    start: 'startTheBridge',
  },
});
