import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'air_plant',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/shell-room',
    start: 'startShellRoom',
    args: ['air_plant'],
  },
});
