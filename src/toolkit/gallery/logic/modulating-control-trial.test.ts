import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { createPanelKit } from '../../components/core/views/eighties-controls';
import { createModulatingControlTrial } from '../../components/plant/views/modulating-control-trial';
import { stubBrowser } from '../views/inspection-audit';

describe('mission 146: the modulating control trial', () => {
  beforeEach(stubBrowser);
  afterEach(() => vi.unstubAllGlobals());

  it('builds a controller, probe and valve and steps the loop', () => {
    const kit = createPanelKit();
    const trial = createModulatingControlTrial(kit);
    for (let i = 0; i < 200; i++) trial.update(1);
    expect(trial.status()).toMatch(/valve /);
    expect(trial.status()).toMatch(/set /);
    trial.dispose();
  });
});
