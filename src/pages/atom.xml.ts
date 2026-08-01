import type { APIContext } from "astro";
import { profileConfig, siteConfig } from "@/config";
import { getFeedPosts, renderAtomFeed } from "@/services/feed";

export async function GET(context: APIContext): Promise<Response> {
	if (!context.site) {
		throw Error("site not set");
	}

	const items = await getFeedPosts(context.site);
	const atomFeed = renderAtomFeed({
		title: siteConfig.title,
		subtitle: siteConfig.subtitle || "No description",
		site: context.site,
		lang: siteConfig.lang,
		author: profileConfig.name,
		items,
		emptyUpdated: new Date(`${siteConfig.siteStartDate}T00:00:00.000Z`),
	});

	return new Response(atomFeed, {
		headers: {
			"Content-Type": "application/atom+xml; charset=utf-8",
		},
	});
}
