import type { SoftwareTitle } from './software-boxes';

/** A physical copy of the game the walker is playing, tucked among the office software. */
export const THE_POOL_BOX: SoftwareTitle = {
  id: 'the-pool',
  title: 'The Pool',
  publisher: 'Independent',
  kind: 'game',
  size: 'classic',
  year: 2026,
  media: 'PC game',
  palette: { background: '#061c32', ink: '#f4f7f1', accent: '#0db8df' },
  style: 'simulation-airbrush',
  publisherLogo: { shape: 'circle', letters: 'P' },
  frontBadges: [],
  blurb:
    'Behind every quiet pool is a building full of machines. Walk the halls, read the gauges and keep the water clean, warm and safe.',
  features: [
    'One simulated leisure centre',
    'Working pumps, filters and controls',
    'Explore the halls and plant rooms',
  ],
  screenshots: ['Control room', 'Plant room', 'Viewing gallery'],
  requirements: {
    cpu: 'Modern desktop computer',
    ram: '8 GB RAM',
    disk: '1 GB free space',
    graphics: 'WebGL 2 capable graphics',
    sound: 'Stereo sound',
    os: 'Desktop operating system',
    drive: 'Internet connection for browser play',
  },
  barcode: '5000000000111',
  price: { amount: 'FREE' },
  ageRating: null,
  compatibility: 'PC compatible',
};
