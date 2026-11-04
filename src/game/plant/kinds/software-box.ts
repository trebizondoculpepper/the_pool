import { defineKind } from '../define-kind';

export default defineKind({
  group: 'other',
  type: 'Software box',
  code: 'SB',
  class: 'non-plant',
  status: 'none',
  purpose: 'A boxed program from the desk, picked up and put back.',
  bindings: [
    {
      room: 'engineers_office',
      thing: 'beige-accounting-leisure-centre-ledger',
    },
    {
      room: 'engineers_office',
      thing: 'bookit-pro-4-for-workgroups',
    },
    {
      room: 'engineers_office',
      thing: 'chlorine-quest-ii-the-shallow-end',
    },
    {
      room: 'engineers_office',
      thing: 'coshh-manager-95',
    },
    {
      room: 'engineers_office',
      thing: 'deep-end',
    },
    {
      room: 'engineers_office',
      thing: 'doseright-gold-2-1',
    },
    {
      room: 'engineers_office',
      thing: 'fenestra-prospect-embedded',
    },
    {
      room: 'engineers_office',
      thing: 'lido-tycoon',
    },
    {
      room: 'engineers_office',
      thing: 'macrosoft-pool-simulator-97',
    },
    {
      room: 'engineers_office',
      thing: 'panes-95',
    },
    {
      room: 'engineers_office',
      thing: 'the-pool',
    },
  ],
  traits: ['box-like', 'holdable-small'],
});
