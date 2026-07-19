import type { RSSFeedItem } from "@astrojs/rss";
import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { siteConfig } from "@/config";
import { getFeedPosts, renderFeedContent } from "@/services/feed";

export async function GET(context: APIContext) {
	if (!context.site) {
		throw Error("site not set");
	}

	const posts = await getFeedPosts();

	const feed: RSSFeedItem[] = [];

	for (const post of posts) {
		feed.push({
			title: post.index.title,
			description: post.index.description,
			pubDate: post.index.published,
			link: post.index.route.canonicalUrl,
			content: await renderFeedContent(post, context.site),
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
