// Original 2–3 sentence write-ups for each curated planet, plus the curated pool lists.
// Facts are drawn from the NASA Exoplanet Archive values; the wording is our own.
import type { Difficulty } from '../src/data/types.ts';

export const PREFERRED: Record<Difficulty, string[]> = {
  easy: [
    'Proxima Cen b',
    'Ross 128 b',
    "Teegarden's Star b",
    "Teegarden's Star c",
    'GJ 1061 c',
    'GJ 1061 d',
    'Wolf 1061 c',
    'GJ 1002 b',
    'GJ 273 b',
    'tau Cet f',
  ],
  medium: [
    'TRAPPIST-1 d',
    'TRAPPIST-1 e',
    'TRAPPIST-1 f',
    'TRAPPIST-1 g',
    'LHS 1140 b',
    'LHS 1140 c',
    'Gliese 12 b',
    'Wolf 1069 b',
    'L 98-59 f',
    'GJ 1132 c',
  ],
  hard: [
    '55 Cnc e',
    'K2-141 b',
    'Kepler-10 b',
    'CoRoT-7 b',
    'Kepler-78 b',
    'LHS 3844 b',
    'GJ 367 b',
    'GJ 3323 c',
    'Kepler-186 f',
    'Kepler-22 b',
    'K2-18 b',
    'Kepler-452 b',
  ],
};

export const DESCRIPTIONS: Record<string, string> = {
  'Proxima Cen b':
    'The closest known exoplanet to our Solar System, circling the small red dwarf Proxima Centauri every 11 days. It sits in its star’s temperate zone, but frequent stellar flares may batter its surface.',
  'Ross 128 b':
    'A world slightly more massive than Earth orbiting a quiet red dwarf. Its star flares far less than many red dwarfs, making it one of the calmer nearby neighbourhoods.',
  "Teegarden's Star b":
    'One of the most Earth-like planets by mass and temperature found so far. It whips around its tiny, dim star in under five days.',
  "Teegarden's Star c":
    'The outer sibling of Teegarden’s Star b, receiving a little less starlight. Expect a colder, darker sky lit by a faint red sun.',
  'GJ 1061 c':
    'A rocky world in a three-planet system around a nearby red dwarf. It orbits inside its star’s temperate zone, completing a year in under a week.',
  'GJ 1061 d':
    'The outermost known planet of GJ 1061, sitting on the cool edge of its star’s temperate zone. A good test of cold-weather engineering close to home.',
  'Wolf 1061 c':
    'A super-Earth about 14 light-years away in the constellation Ophiuchus. It may be tidally locked, with one side in permanent daylight.',
  'GJ 1002 b':
    'A close-to-Earth-mass planet orbiting a cool red dwarf just under 16 light-years away. Its star is unusually quiet, a bonus for future visitors.',
  'GJ 273 b':
    'Also known as Luyten b, a super-Earth in the temperate zone of a red dwarf about 19 light-years from us. Its heavier gravity makes take-off a little harder.',
  'tau Cet f':
    'A candidate super-Earth orbiting tau Ceti, a Sun-like star visible to the naked eye. It sits near the cold outer edge of the star’s habitable zone.',
  'TRAPPIST-1 d':
    'The smallest of TRAPPIST-1’s worlds in this game, with under half of Earth’s mass. Low gravity makes landing gentle, but it may hold little air.',
  'TRAPPIST-1 e':
    'Often called the most promising TRAPPIST-1 planet for liquid water. It is rocky, a bit smaller than Earth, and among seven worlds packed around one ultra-cool star.',
  'TRAPPIST-1 f':
    'A nearly Earth-sized world in the TRAPPIST-1 system, cooler than its neighbour e. Its sky would show the other planets as large, bright discs.',
  'TRAPPIST-1 g':
    'One of the larger TRAPPIST-1 planets, orbiting on the chilly side of the system’s temperate zone. Its year lasts just over 12 Earth days.',
  'LHS 1140 b':
    'A dense super-Earth roughly 49 light-years away, one of the best targets for studying a temperate world’s atmosphere. Its strong gravity punishes heavy rockets.',
  'LHS 1140 c':
    'The inner, warmer companion of LHS 1140 b. It circles its red dwarf in under four days.',
  'Gliese 12 b':
    'A world just under Earth’s size, found by NASA’s TESS mission in 2024. It is warmer than Earth but cooler than most transiting planets this close to us.',
  'Wolf 1069 b':
    'An Earth-mass planet around a red dwarf about 31 light-years away. It is probably tidally locked, with a permanent day side and night side.',
  'L 98-59 f':
    'The outermost planet in the busy L 98-59 system, detected by the wobble it causes in its star. It sits in the temperate zone.',
  'GJ 1132 c':
    'A super-Earth that orbits further out than its scorching sibling GJ 1132 b. It is temperate, but its heavier gravity means a costly ascent.',
  '55 Cnc e':
    'A super-hot super-Earth that circles its star in less than a day. Its surface may be covered in molten rock, a true lava world.',
  'K2-141 b':
    'A lava planet so close to its star that the day side may rain vaporised rock. A year here lasts under seven hours.',
  'Kepler-10 b':
    'The first rocky planet confirmed by NASA’s Kepler mission. It orbits its star in under a day, roasting at over 2,000 K.',
  'CoRoT-7 b':
    'One of the first rocky exoplanets ever found. It is hot enough that its day side could be an ocean of magma.',
  'Kepler-78 b':
    'An Earth-sized world that completes an orbit in about 8.5 hours. Its surface is likely molten, and it is doomed to spiral into its star one day.',
  'LHS 3844 b':
    'A bare, rocky world that NASA’s Spitzer telescope found has little or no atmosphere. Its day side bakes while its night side freezes.',
  'GJ 367 b':
    'A tiny, ultra-dense planet with an orbit of under eight hours. It may be mostly iron, like an oversized version of Mercury’s core.',
  'GJ 3323 c':
    'A frigid super-Earth around a nearby red dwarf. With an equilibrium temperature below 150 K, ice and cold, dense gases rule here.',
  'Kepler-186 f':
    'The first Earth-sized planet found in the habitable zone of another star. It lies on the cold outer edge, about 580 light-years away.',
  'Kepler-22 b':
    'Kepler’s first habitable-zone planet around a Sun-like star. It is more than twice Earth’s size and over two Earth gravities, possibly an ocean world.',
  'K2-18 b':
    'A temperate world 2.4 times Earth’s size, studied by the James Webb Space Telescope for signs of a hydrogen-rich atmosphere and possible ocean.',
  'Kepler-452 b':
    'Sometimes called Earth’s older cousin: it orbits a Sun-like star once every 385 days. At about 1,800 light-years away it is a very long voyage.',
};
