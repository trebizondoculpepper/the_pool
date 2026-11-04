import { defineTrait } from '../define-kind';

export default defineTrait({
  description: 'Something to sit on, moved about.',
  extends: ['box-like', 'floor-standing', 'sittable', 'luggable'],
});
