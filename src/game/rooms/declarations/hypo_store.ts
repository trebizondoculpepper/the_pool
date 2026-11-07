import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'hypo_store',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/shell-room',
    start: 'startShellRoom',
    args: ['hypo_store'],
  },
});
