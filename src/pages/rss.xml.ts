import type { RSSFeedItem } from "@astrojs/rss";
import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { siteConfig } from "@/config";
import { getFeedPosts } from "@/services/feed";

export async function GET(context: APIContext) {
	if (!context.site) {
		throw Error("site not set");
	}

	const posts = await getFeedPosts(context.site);

	const feed: RSSFeedItem[] = [];

	for (const post of posts) {
		feed.push({
			title: post.title,
			description: post.summary,
			pubDate: post.published,
			link: post.url,
			categories: post.categories,
		});
	}

	return rss({
		title: siteConfig.title,
		description: siteConfig.subtitle || "No description",
		site: context.site,
		items: feed,
		customData: `<language>${siteConfig.lang}</language>`,
	});
}
