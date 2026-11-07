import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'ceiling_lab',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/ceiling-lab-room',
    start: 'startCeilingLabRoom',
  },
});
