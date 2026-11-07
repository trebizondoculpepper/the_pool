import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'acid_store',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/shell-room',
    start: 'startShellRoom',
    args: ['acid_store'],
  },
});
