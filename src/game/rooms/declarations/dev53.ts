import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'dev53',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/skimmer-reveal-room',
    start: 'startSkimmerRevealRoom',
  },
});
