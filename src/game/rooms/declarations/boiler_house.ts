import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'boiler_house',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/shell-room',
    start: 'startShellRoom',
    args: ['boiler_house'],
  },
});
