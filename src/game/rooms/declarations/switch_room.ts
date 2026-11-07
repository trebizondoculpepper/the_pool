import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'switch_room',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/shell-room',
    start: 'startShellRoom',
    args: ['switch_room'],
  },
});
