import { defineTrait } from '../define-kind';

export default defineTrait({
  description:
    'A rotating or packaged machine (a pump, a booster, a treatment unit), driven, its controls worked; floor- or wall-mounted per kind.',
  extends: ['box-like', 'fixed', 'operable'],
});
