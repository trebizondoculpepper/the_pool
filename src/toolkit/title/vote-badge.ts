/**
 * The game's VibeTopList vote badge, VibeTopList's own purple "Featured
 * on VibeTopList" button (kept here as they supply it, not fetched from
 * them, so showing it tells them nothing), linked to the game's vote page.
 * Shown on the title screen and on the pause menu's vote panel.
 */

import badgeUrl from '../../../resources/images/vibetoplist/vibetoplist-badge.svg?url';

/** The badge's image. */
export const VOTE_BADGE_URL = badgeUrl;

/** Where a vote for the game is cast. */
export const VOTE_URL = 'https://vibetoplist.com/vote/the-pool';

/** The badge as a link to vote, opening in a new tab. */
export function createVoteBadge(className: string): HTMLAnchorElement {
  const link = document.createElement('a');
  link.className = className;
  link.href = VOTE_URL;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.title = 'Vote for The Pool on VibeTopList';
  const image = document.createElement('img');
  image.src = badgeUrl;
  image.alt = 'Featured on VibeTopList: vote for this game';
  image.width = 190;
  image.height = 52;
  image.draggable = false;
  link.append(image);
  return link;
}
