/**
 * One-off (the owner, 2026-11-05): this timed two-message script exists only
 * in the phone interaction dev room to prove shared inbox delivery before
 * authored plant scenarios supply their own events.
 */
export function createPhoneMessageTrial(deliver: (number: 1 | 2) => void) {
  let elapsed = 0;
  let next = 0;
  const thresholds = [20, 120] as const;
  return {
    reset() {
      elapsed = 0;
      next = 0;
    },
    step(delta: number) {
      if (!Number.isFinite(delta) || delta <= 0) return;
      elapsed += delta;
      while (next < thresholds.length && elapsed >= thresholds[next]) {
        deliver((next + 1) as 1 | 2);
        next++;
      }
    },
  };
}
