import type { PlantExhibit } from './exhibit';
import { phoneInbox } from '../../../controls/logic/phone-menu';
import { createPhoneMessageTrial } from '../../logic/phone-message-trial';

export const PURPOSE = 'Phone interaction: two incoming test messages';
export const EXHIBITS: readonly PlantExhibit[] = [];

/**
 * One-off (the owner, 2026-11-05): this development room deliberately sends
 * two scripted test texts so the reusable phone inbox and alert can be tried
 * before authored plant events exist. No other room has this private timer.
 */
export function createRoomScript() {
  return createPhoneMessageTrial((number) => {
    phoneInbox.receive(
      'Pool Plant',
      number === 1
        ? 'Phone trial: the first report arrived after 20 seconds.'
        : 'Phone trial: the second report arrived after two minutes.',
    );
  });
}
