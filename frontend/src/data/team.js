/*
 * PLACEHOLDER TEAM DATA
 * These entries carry the layout only - names, roles, bios and portraits are
 * stand-ins from the design mock. Replace each field (and the `image` URL with
 * a real photograph in /public) before this page goes live.
 */
const portrait = (id) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=700&q=85`;

export const team = [
  {
    id: 'arjun',
    name: 'Arjun Rawat',
    role: 'Co-Founder',
    bio: 'The dreamer and the strategist.',
    image: portrait('1500648767791-00dcc994a43e'),
    social: { facebook: '#', instagram: '#', linkedin: '#' },
  },
  {
    id: 'meera',
    name: 'Meera Thakur',
    role: 'Head of Experiences',
    bio: 'The planner with an eye for details.',
    image: portrait('1494790108377-be9c29b29330'),
    social: { facebook: '#', instagram: '#', linkedin: '#' },
  },
  {
    id: 'dev',
    name: 'Dev Negi',
    role: 'Operations Lead',
    bio: 'The backbone who keeps everything running.',
    image: portrait('1507003211169-0a1dd7228f2d'),
    social: { facebook: '#', instagram: '#', linkedin: '#' },
  },
  {
    id: 'zoya',
    name: 'Zoya Sheikh',
    role: 'Story & Content Lead',
    bio: 'The storyteller who brings our journeys to life.',
    image: portrait('1573497019940-1c28c88b4f3e'),
    social: { facebook: '#', instagram: '#', linkedin: '#' },
  },
];
