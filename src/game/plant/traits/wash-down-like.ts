import { defineTrait } from '../define-kind';

export default defineTrait({
  description: 'A safety wash point, fixed in place, pulled to work.',
  extends: ['box-like', 'fixed', 'safety-gear'],
});
