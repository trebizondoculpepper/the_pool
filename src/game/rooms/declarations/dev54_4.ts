import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'dev54_4',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/lift-rooms',
    start: 'startLiftTrialFloor',
    args: ['4'],
  },
});
