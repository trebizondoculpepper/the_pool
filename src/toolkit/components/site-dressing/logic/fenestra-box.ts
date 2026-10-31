import type { SoftwareTitle } from './software-boxes';

/** The service copy of the operating system inside the Dr Aqualis Trio. */
export const FENESTRA_PROSPECT_BOX: SoftwareTitle = {
  id: 'fenestra-prospect-embedded',
  title: 'Fenestra Prospect Embedded 6.0',
  publisher: 'Mullion Software Corporation',
  kind: 'business',
  size: 'small-box',
  year: 2008,
  media: 'DVD-ROM · service licence',
  palette: { background: '#102b43', ink: '#f4faf9', accent: '#5cd9cd' },
  style: 'corporate-gradient',
  publisherLogo: { shape: 'circle', letters: 'M' },
  frontBadges: ['PROFESSIONAL EDITION', 'For embedded controllers'],
  blurb:
    'A service copy of Fenestra Prospect Embedded for dedicated control computers. Restore a cabinet, connect its device drivers and return its applications to duty after a fault.',
  features: [
    'Embedded controller recovery tools',
    'Device driver library and diagnostics',
    'Permission Steward access controls',
    'Prospect Glass desktop environment',
  ],
  screenshots: ['Prospect desktop', 'Device Manager', 'System recovery'],
  businessUi: {
    menu: 'File  Edit  View  Tools  Help',
    toolbar: 'SYSTEM   DEVICES   RECOVERY',
    columns: ['DEVICE', 'STATUS', 'DRIVER'],
  },
  requirements: {
    cpu: 'Corvid M or compatible x86 processor',
    ram: '512 MB RAM (1 GB recommended)',
    disk: '4 GB free fixed disk space',
    graphics: 'SVGA 640 × 480 or better',
    sound: 'Optional',
    os: 'Bootable installer',
    drive: 'DVD-ROM drive',
  },
  barcode: '5000000000098',
  price: { amount: '£129.00' },
  ageRating: null,
  compatibility: 'Fenestra Prospect Embedded',
};
