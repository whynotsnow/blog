import { getContentStore } from "./core/content-store";
import type { PostIndexEntry } from "./core/types";

export type FeedItemViewModel = {
	title: string;
	summary: string;
	url: string;
	published: Date;
	updated: Date;
	categories: string[];
};

export type AtomFeedOptions = {
	title: string;
	subtitle: string;
	site: URL;
	lang: string;
	author: string;
	items: FeedItemViewModel[];
	emptyUpdated: Date;
};

export function toFeedItem(post: PostIndexEntry, site: URL): FeedItemViewModel {
	return {
		title: post.title,
		summary: post.description.trim() || post.excerpt.trim() || post.title,
		url: new URL(post.route.canonicalUrl, site).href,
		published: post.published,
		updated: post.updated ?? post.published,
		categories: Array.from(
			new Set(
				[
					post.category.name,
					...post.tags.map((tag) => tag.name),
				].filter(Boolean),
			),
		),
	};
}

export function buildFeedItems(
	posts: readonly PostIndexEntry[],
	site: URL,
): FeedItemViewModel[] {
	return posts
		.filter((post) => !post.encrypted && !post.draft)
		.map((post) => toFeedItem(post, site));
}

export async function getFeedPosts(site: URL): Promise<FeedItemViewModel[]> {
	const { posts } = await getContentStore();
	return buildFeedItems(posts, site);
}

export function escapeXmlText(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;");
}

export function escapeXmlAttribute(value: string): string {
	return escapeXmlText(value)
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&apos;");
}

export function getFeedUpdated(
	items: readonly FeedItemViewModel[],
	fallback: Date,
): Date {
	if (items.length === 0) return fallback;

	return items
		.slice(1)
		.reduce(
			(latest, item) => (item.updated > latest ? item.updated : latest),
			items[0].updated,
		);
}

export function renderAtomFeed(options: AtomFeedOptions): string {
	const siteUrl = options.site.href;
	const selfUrl = new URL("atom.xml", options.site).href;
	const language = options.lang.replace("_", "-");
	const updated = getFeedUpdated(options.items, options.emptyUpdated);
	const entries = options.items
		.map(
			(item) => `  <entry>
    <title>${escapeXmlText(item.title)}</title>
    <link href="${escapeXmlAttribute(item.url)}" rel="alternate" type="text/html"/>
    <id>${escapeXmlText(item.url)}</id>
    <published>${item.published.toISOString()}</published>
    <updated>${item.updated.toISOString()}</updated>
    <summary type="text">${escapeXmlText(item.summary)}</summary>
    <author>
      <name>${escapeXmlText(options.author)}</name>
    </author>${item.categories
		.map(
			(category) =>
				`\n    <category term="${escapeXmlAttribute(category)}"/>`,
		)
		.join("")}
  </entry>`,
		)
		.join("\n");

	return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${escapeXmlAttribute(language)}">
  <title>${escapeXmlText(options.title)}</title>
  <subtitle>${escapeXmlText(options.subtitle)}</subtitle>
  <link href="${escapeXmlAttribute(siteUrl)}" rel="alternate" type="text/html"/>
  <link href="${escapeXmlAttribute(selfUrl)}" rel="self" type="application/atom+xml"/>
  <id>${escapeXmlText(siteUrl)}</id>
  <updated>${updated.toISOString()}</updated>
${entries}${entries ? "\n" : ""}</feed>`;
}
