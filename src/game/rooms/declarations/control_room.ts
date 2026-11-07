import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'control_room',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/shell-room',
    start: 'startShellRoom',
    args: ['control_room'],
  },
});
