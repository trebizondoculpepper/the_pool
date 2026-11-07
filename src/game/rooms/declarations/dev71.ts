import { defineRoom } from '../define-room';

export default defineRoom({
  id: 'dev71',
  build: {
    kind: 'module',
    module: 'toolkit/gallery/rooms/plant-room',
    start: 'startEquipmentRoom',
    args: ['dev71'],
  },
  traits: [
    {
      trait: 'timed-events',
      config: {
        events: [
          {
            at: 20,
            type: 'phone-message',
            sender: 'Pool Plant',
            text: 'Phone trial: the first report arrived after 20 seconds.',
          },
          {
            at: 120,
            type: 'phone-message',
            sender: 'Pool Plant',
            text: 'Phone trial: the second report arrived after two minutes.',
          },
        ],
      },
    },
  ],
});
