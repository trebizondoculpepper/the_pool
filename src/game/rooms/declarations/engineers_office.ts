import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'engineers_office',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/shell-room',
    start: 'startShellRoom',
    args: ['engineers_office'],
  },
});
