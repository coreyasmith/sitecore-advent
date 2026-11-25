import rss from '@astrojs/rss';
import { CALENDAR_YEARS, getYearPosts } from '@/utils/calendar';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';

// Every year's posts, newest first
export async function GET(context) {
	const years = await Promise.all(
		CALENDAR_YEARS.map(async (year) =>
			(await getYearPosts(year)).map((post) => ({
				...post.data,
				link: `/${year}/${post.id}/`,
			})),
		),
	);
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: years.flat().sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf()),
	});
}
