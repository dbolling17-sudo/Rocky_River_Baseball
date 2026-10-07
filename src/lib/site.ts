import { getCollection } from 'astro:content';

export async function getSettings() {
  const [entry] = await getCollection('settings');
  if (!entry) throw new Error('src/data/settings.yaml is empty.');
  return entry.data;
}

export type NavItem = { label: string; href: string; children?: { label: string; href: string }[] };

export const NAV: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Calendar', href: '/calendar/' },
  {
    label: 'Team',
    href: '/roster/',
    children: [
      { label: 'Roster', href: '/roster/' },
      { label: 'Coaches', href: '/coaches/' },
    ],
  },
  { label: 'News', href: '/news/' },
  {
    label: 'Program',
    href: '/program/',
    children: [
      { label: 'Program Information', href: '/program/' },
      { label: 'Player Development', href: '/player-development/' },
      { label: 'Youth & Community', href: '/youth/' },
    ],
  },
  {
    label: 'Community',
    href: '/alumni/',
    children: [
      { label: 'Alumni & History', href: '/alumni/' },
      { label: 'Highlights', href: '/highlights/' },
      { label: 'Photos & Media', href: '/photos/' },
      { label: 'Sponsors & Supporters', href: '/sponsors/' },
    ],
  },
  { label: 'Contact', href: '/contact/' },
];
