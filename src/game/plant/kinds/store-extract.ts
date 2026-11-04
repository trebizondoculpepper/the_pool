import { defineKind } from '../define-kind';

export default defineKind({
  group: 'placed',
  type: 'Extract unit',
  code: 'AHU',
  class: 'plant',
  status: 'none',
  purpose: 'Extracts store air and monitors for hazardous gas.',
  traits: ['duct-air-like', 'wall-mounted'],
});
