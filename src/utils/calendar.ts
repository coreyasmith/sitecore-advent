import { getCollection } from 'astro:content';

// Each calendar year and the content collection that holds its posts
const collections = {
  2025: 'advent2025',
  2026: 'advent2026',
} as const;

type CalendarYear = keyof typeof collections;

/** Calendar years, newest first. Each has a calendar page at /<year>/. */
export const CALENDAR_YEARS = Object.keys(collections).map(Number).sort((a, b) => b - a);

/**
 * Where to link a year's calendar. The home page is the newest year's calendar
 * (src/pages/index.astro), so that year links home.
 */
export const calendarHref = (year: number) => (year === CALENDAR_YEARS[0] ? '/' : `/${year}/`);

/** How many posts a calendar has open. One with none yet (the weeks before December) says when it starts. */
export const postCountLabel = (posts: number) =>
  posts === 0 ? 'Starts December 1st' : posts === 1 ? '1 post' : `${posts} posts`;

/**
 * All of a year's posts, oldest first, including any from before December 1 (like
 * 2025's welcome post). The RSS feed lists these.
 */
export async function getYearPosts(year: number) {
  const collection = collections[year as CalendarYear];
  if (!collection) return [];
  return (await getCollection(collection)).sort((a, b) => a.data.pubDate.valueOf() - b.data.pubDate.valueOf());
}

/**
 * The posts on a year's calendar, in door order: those dated from December 1 up to
 * when the site is built. Each build opens the doors whose day has come. The header's
 * year menu counts these too, so its post counts always match the calendar.
 */
export async function getCalendarPosts(year: number) {
  const start = new Date(`${year}-12-01`);
  const now = new Date();
  // No doors open before December 1. Skipping the lookup also keeps Astro from warning
  // about an empty collection on every page while a new year has no posts yet.
  if (now < start) return [];

  return (await getYearPosts(year)).filter((post) => post.data.pubDate >= start && post.data.pubDate <= now);
}

// Door colors. Class strings are written out in full so Tailwind picks them up.
const doorColors = {
  fuchsia: { classes: 'from-fuchsia-500 to-fuchsia-700', hex: '#d946ef' },
  rose: { classes: 'from-rose-500 to-rose-700', hex: '#f43f5e' },
  green: { classes: 'from-green-500 to-green-700', hex: '#22c55e' },
  blue: { classes: 'from-blue-500 to-blue-700', hex: '#3b82f6' },
  yellow: { classes: 'from-yellow-500 to-yellow-700', hex: '#eab308' },
  purple: { classes: 'from-purple-500 to-purple-700', hex: '#a855f7' },
  teal: { classes: 'from-teal-500 to-teal-700', hex: '#14b8a6' },
  orange: { classes: 'from-orange-500 to-orange-700', hex: '#f97316' },
};

// Each year uses the same eight colors in its own order. The 2026 order starts
// on green, and no door shares a color family with the same door in 2025.
const yearColors: Record<number, (keyof typeof doorColors)[]> = {
  2025: ['fuchsia', 'rose', 'green', 'blue', 'yellow', 'purple', 'teal', 'orange'],
  2026: ['green', 'blue', 'rose', 'yellow', 'purple', 'teal', 'orange', 'fuchsia'],
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
  return doorColors[colors[(col + row * 2) % colors.length]].classes;
}

/** The first six colors of `year`'s calendar, for the doors on the year menu's calendar icon */
export function getIconColors(year: number) {
  return colorsFor(year).slice(0, 6).map((name) => doorColors[name].hex);
}

/** The year menu's calendar icon, in a year's site theme */
export interface IconTheme {
  /** The page the doors sit on */
  page: string;
  /** The edge around the page */
  frame: string;
  /** The band across the top: a color, or a left-to-right gradient between two */
  band: string | [string, string];
  /** The binder rings */
  rings: string;
  /** Doors whose post isn't live yet */
  lockedDoor: string;
}

// Each year's icon matches that year's site theme (see global.css), and stands out on its
// dark header. A year without its own theme uses 2025's.
const iconThemes: Record<number, IconTheme> = {
  2025: { page: '#fff', frame: '#15803d', band: '#15803d', rings: '#dc2626', lockedDoor: '#d1d5db' },
  // Mulled Stars: the wine, rose to crimson, with icy rings like its snowflakes
  2026: { page: '#fff', frame: '#e11d48', band: ['#fb7185', '#e11d48'], rings: '#e0f2fe', lockedDoor: '#d1d5db' },
};

export const getIconTheme = (year: number) => iconThemes[year] ?? iconThemes[2025];

// Years whose doors sit on a red page (2026's Mulled Stars), where a deeper drop shadow
// keeps the red and rose doors apart from it
const deepShadowDoorYears = new Set([2026]);

/** The drop shadow under `year`'s calendar doors (written out in full for Tailwind) */
export const getDoorShadow = (year: number) => (deepShadowDoorYears.has(year) ? 'shadow-[0_12px_24px_-6px_rgb(0_0_0/0.5)]' : 'shadow-lg');

/** A year's card color on the All Calendars page: its theme's page color */
const cardColors: Record<number, string> = {
  2025: '#00472c',
  2026: '#8f1230',
};

export const getCardColor = (year: number) => cardColors[year] ?? cardColors[2025];
