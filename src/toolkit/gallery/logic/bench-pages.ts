import { UNBRANDED_LINK, brandAuditLink } from './brand-audit';
import type { BrandId } from '../../components/core/logic/brands';
import { itemAuditLink, magicPageLink, magicRoomLink } from './item-audit';
import { auditLink } from './look-catalogue';
import { registerPage } from './page-registry';
import { traitAuditLink } from './trait-audit';

/**
 * The development pages that exist today, registered with the bench index
 * (mission 137). A new page registers itself the same way, beside its own
 * route in `src/bench.ts`. Importing this module registers them.
 */

const enc = encodeURIComponent;

registerPage({
  id: 'enter',
  name: 'Enter the room',
  branch: 'rooms',
  subject: 'room',
  link: (room) => `./?room=${enc(room)}`,
});
registerPage({
  id: 'room-audit',
  name: 'Room audit',
  branch: 'rooms',
  subject: 'room',
  link: auditLink,
});
registerPage({
  id: 'lookables-room',
  name: 'Look audit',
  branch: 'rooms',
  subject: 'room',
  link: (room) => `bench.html?bench=lookables&room=${enc(room)}`,
});

registerPage({
  id: 'item-audit',
  name: 'Item audit (CAD views, HIGH and LOW cost)',
  branch: 'things',
  subject: 'kind',
  link: itemAuditLink,
});
registerPage({
  id: 'trait-audit',
  name: 'Traits: every trait, what composes it, the kinds and objects with it',
  branch: 'things',
  subject: 'none',
  link: () => traitAuditLink(),
});
registerPage({
  id: 'magic-room',
  name: 'Magic room (POLY: HIGH · LOW)',
  branch: 'things',
  subject: 'kind',
  link: magicRoomLink,
});
registerPage({
  id: 'magic-page',
  name: 'Magic page',
  branch: 'things',
  subject: 'kind',
  link: magicPageLink,
});

registerPage({
  id: 'brand-audit',
  name: 'Brand audit',
  branch: 'brands',
  subject: 'brand',
  link: (brand) => brandAuditLink(brand as BrandId),
});
registerPage({
  id: 'brand-list',
  name: 'Every brand',
  branch: 'brands',
  subject: 'none',
  link: () => 'bench.html?bench=brand-audit',
});
registerPage({
  id: 'unbranded',
  name: 'Unbranded goods',
  branch: 'brands',
  subject: 'none',
  link: () => UNBRANDED_LINK,
});

registerPage({
  id: 'components',
  name: 'Component benchmark',
  branch: 'tools',
  subject: 'none',
  link: () => 'bench.html?bench=components&slot=bench094',
});
registerPage({
  id: 'lookables',
  name: 'Look audit, every room',
  branch: 'tools',
  subject: 'none',
  link: () => 'bench.html?bench=lookables',
});
registerPage({
  id: 'dev',
  name: 'The game with the ?dev panel',
  branch: 'tools',
  subject: 'none',
  link: () => './?dev',
});
