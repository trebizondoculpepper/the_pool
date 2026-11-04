import { defineTrait } from '../define-kind';

export default defineTrait({
  description:
    'A wall mimic board: a display of plant state, read only; a control panel that also has working buttons is a different kind.',
  extends: ['panel-like', 'wall-mounted', 'fixed', 'readable'],
});
