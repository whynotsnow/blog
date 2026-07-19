import type { APIContext } from "astro";
import { profileConfig, siteConfig } from "@/config";
import { getFeedPosts, renderFeedContent } from "@/services/feed";

export async function GET(context: APIContext) {
	if (!context.site) {
		throw Error("site not set");
	}

	const posts = await getFeedPosts();

	// 创建Atom feed头部
	let atomFeed = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${siteConfig.title}</title>
  <subtitle>${siteConfig.subtitle || "No description"}</subtitle>
  <link href="${context.site}" rel="alternate" type="text/html"/>
  <link href="${new URL("atom.xml", context.site)}" rel="self" type="application/atom+xml"/>
  <id>${context.site}</id>
  <updated>${new Date().toISOString()}</updated>
  <language>${siteConfig.lang}</language>`;

	for (const post of posts) {
		const postUrl = new URL(post.index.route.canonicalUrl, context.site)
			.href;
		const content = await renderFeedContent(post, context.site);

		atomFeed += `
  <entry>
    <title>${post.index.title}</title>
    <link href="${postUrl}" rel="alternate" type="text/html"/>
    <id>${postUrl}</id>
    <published>${post.index.published.toISOString()}</published>
    <updated>${post.index.updated?.toISOString() || post.index.published.toISOString()}</updated>
    <summary>${post.index.description || ""}</summary>
    <content type="html"><![CDATA[${content}]]></content>
    <author>
      <name>${profileConfig.name}</name>
    </author>`;

		// 添加分类标签
		if (post.index.category.name) {
			atomFeed += `
    <category term="${post.index.category.name}"></category>`;
		}

		atomFeed += `
  </entry>`;
	}

	// 关闭Atom feed
	atomFeed += `
</feed>`;

	return new Response(atomFeed, {
		headers: {
			"Content-Type": "application/atom+xml; charset=utf-8",
		},
	});
}
