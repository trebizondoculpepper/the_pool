import { describe, expect, it } from 'vite-plus/test';
import {
  SETPOINT_MAX,
  SETPOINT_MIN,
  SETPOINT_POSITIONS,
  SETPOINT_STEP,
} from '../views/temperature-controller-placeholder';

describe("the placeholder controller's SET POINT dial", () => {
  it('is 25.0 to 35.0 °C in 0.5 °C steps (21 positions)', () => {
    expect(SETPOINT_MIN).toBe(25);
    expect(SETPOINT_MAX).toBe(35);
    expect(SETPOINT_STEP).toBe(0.5);
    expect(SETPOINT_POSITIONS).toBe(21);
  });

  it('the dial step maps to a 0.5 °C change', () => {
    // A decade of 0.5 steps covers the whole range.
    expect((SETPOINT_MAX - SETPOINT_MIN) / SETPOINT_STEP).toBe(20);
  });
});
