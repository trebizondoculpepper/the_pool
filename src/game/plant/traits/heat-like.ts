import { defineTrait } from '../define-kind';

export default defineTrait({
  description: "The boiler house's boiler plant and its heat exchange.",
  extends: ['box-like', 'floor-standing', 'fixed', 'operable'],
});
