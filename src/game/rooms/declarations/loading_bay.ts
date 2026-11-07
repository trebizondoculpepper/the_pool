import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'loading_bay',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/shell-room',
    start: 'startShellRoom',
    args: ['loading_bay'],
  },
});
