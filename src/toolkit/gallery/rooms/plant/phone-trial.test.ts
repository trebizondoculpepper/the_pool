import { describe, expect, it } from 'vite-plus/test';
import { phoneInbox } from '../../../controls/logic/phone-menu';
import { createRoomScript } from './phone-trial';

describe('dev71 phone trial', () => {
  it('delivers both reports through the shared inbox', () => {
    const before = phoneInbox.list().length;
    const trial = createRoomScript();
    trial.step(20);
    expect(phoneInbox.list()).toHaveLength(before + 1);
    expect(phoneInbox.list()[0].text).toContain('20 seconds');
    trial.step(100);
    expect(phoneInbox.list()).toHaveLength(before + 2);
    expect(phoneInbox.list()[0].text).toContain('two minutes');
    trial.step(100);
    expect(phoneInbox.list()).toHaveLength(before + 2);
  });
});
