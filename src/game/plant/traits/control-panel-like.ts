import { defineTrait } from '../define-kind';

export default defineTrait({
  description:
    'A panel or board with working controls (switches, lamps, pushbuttons); its form and support per kind.',
  extends: ['fixed', 'operable'],
});
