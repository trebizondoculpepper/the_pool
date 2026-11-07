import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'dev36',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/shell-room',
    start: 'startMusicEffectsRoom',
  },
});
