import { getCollection } from 'astro:content';

// Each calendar year and the content collection that holds its posts
const collections = {
  2025: 'advent2025',
} as const;

type CalendarYear = keyof typeof collections;

/**
 * The posts on a year's calendar, in door order: those dated from December 1 up to
 * when the site is built. Each build opens the doors whose day has come.
 */
export async function getCalendarPosts(year: number) {
  const collection = collections[year as CalendarYear];
  if (!collection) return [];

  const start = new Date(`${year}-12-01`);
  const now = new Date();
  return (await getCollection(collection))
    .filter((post) => post.data.pubDate >= start && post.data.pubDate <= now)
    .sort((a, b) => a.data.pubDate.valueOf() - b.data.pubDate.valueOf());
}

// Door colors. Class strings are written out in full so Tailwind picks them up.
const doorColors = {
  fuchsia: 'from-fuchsia-500 to-fuchsia-700',
  rose: 'from-rose-500 to-rose-700',
  green: 'from-green-500 to-green-700',
  blue: 'from-blue-500 to-blue-700',
  yellow: 'from-yellow-500 to-yellow-700',
  purple: 'from-purple-500 to-purple-700',
  teal: 'from-teal-500 to-teal-700',
  orange: 'from-orange-500 to-orange-700',
};

// Each year uses the same eight colors in its own order.
const yearColors: Record<number, (keyof typeof doorColors)[]> = {
  2025: ['fuchsia', 'rose', 'green', 'blue', 'yellow', 'purple', 'teal', 'orange'],
};

const colorsFor = (year: number) => yearColors[year] ?? yearColors[2025];

/**
 * Gradient classes for door `index` (0-based) of `year`'s calendar. Each row of
 * five shifts the colors by 2, so touching doors never match.
 */
export function getDoorColor(index: number, year: number) {
  const colors = colorsFor(year);
  const row = Math.floor(index / 5);
  const col = index % 5;
  return doorColors[colors[(col + row * 2) % colors.length]];
}
