import { describe, expect, it } from 'vite-plus/test';
import { createPhoneMessageTrial } from './phone-message-trial';

describe('phone message trial timing', () => {
  it('crosses each threshold once even with uneven or large steps', () => {
    const delivered: number[] = [];
    const trial = createPhoneMessageTrial((number) => delivered.push(number));
    trial.step(19.9);
    expect(delivered).toEqual([]);
    trial.step(0.2);
    expect(delivered).toEqual([1]);
    trial.step(98);
    expect(delivered).toEqual([1]);
    trial.step(3);
    expect(delivered).toEqual([1, 2]);
    trial.step(1000);
    expect(delivered).toEqual([1, 2]);
    trial.reset();
    trial.step(20);
    expect(delivered).toEqual([1, 2, 1]);
  });

  it('replays on a new room visit and ignores invalid deltas', () => {
    const delivered: number[] = [];
    const visit = () =>
      createPhoneMessageTrial((number) => delivered.push(number));
    const first = visit();
    first.step(-5);
    first.step(Number.NaN);
    first.step(121);
    expect(delivered).toEqual([1, 2]);
    const second = visit();
    second.step(20);
    expect(delivered).toEqual([1, 2, 1]);
  });
});
