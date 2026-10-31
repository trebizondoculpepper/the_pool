import type { SoftwareTitle } from './software-boxes';

/** The boxed operating system shown beside the engineer's PANES 95 PC. */
export const PANES_95_BOX: SoftwareTitle = {
  id: 'panes-95',
  title: 'PANES 95',
  publisher: 'Macrosoft',
  kind: 'business',
  size: 'classic',
  year: 1995,
  media: 'CD-ROM & startup disk',
  palette: { background: '#092650', ink: '#f7f4d5', accent: '#6fc9ec' },
  style: 'corporate-gradient',
  publisherLogo: { shape: 'hexagon', letters: 'M' },
  frontBadges: ['YOUR PC, REIMAGINED', 'Start something familiar.'],
  blurb:
    'Open a new view of your PC. PANES 95 brings your programs, files and settings together on one colourful desktop, with a Start button ready for whatever the day asks.',
  features: [
    'One desktop for work and play',
    'Plug and Play hardware discovery',
    'Long file names and easy shortcuts',
    'Built-in networking for the whole office',
  ],
  screenshots: ['The desktop', 'My Machine', 'The Network'],
  businessUi: {
    menu: 'File  Edit  View  Favourites  Help',
    toolbar: 'BACK   OPEN   FIND',
    columns: ['NAME', 'TYPE', 'SIZE'],
  },
  requirements: {
    cpu: '386DX or better; Quintium recommended',
    ram: '4 MB RAM (8 MB recommended)',
    disk: '55 MB free hard disk space',
    graphics: 'VGA display or better',
    sound: 'SoundBucket card optional',
    os: 'PC-DOZE 5.0 for upgrade installation',
    drive: 'CD-ROM and 3.5" floppy drives',
  },
  barcode: '5000000000104',
  price: { amount: '£79.95' },
  ageRating: null,
  compatibility: 'PC compatible',
};
