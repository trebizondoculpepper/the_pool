import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'duty_managers_office',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/shell-room',
    start: 'startDutyManagersOffice',
  },
});
