import { describe, expect, it } from "vitest";
import { buildPostRouteIndex } from "@/services/core/post-routes";
import type { PostIndexEntry } from "@/services/core/types";
import { buildCanonicalPostPaths } from "@/services/post-detail/static-paths";

function post(id: string, alias?: string): PostIndexEntry {
	const canonicalSlug = alias ?? id;
	return {
		id,
		route: {
			postId: id,
			defaultSlug: id,
			canonicalSlug,
			canonicalUrl: `/posts/${canonicalSlug}/`,
			usesAlias: Boolean(alias),
		},
	} as PostIndexEntry;
}

describe("post detail canonical static paths", () => {
	it("returns exactly one canonical path for each post", () => {
		const posts = [post("plain"), post("legacy-name", "canonical-name")];
		const routes = buildPostRouteIndex(
			posts.map((entry) => ({
				id: entry.id,
				filePath: `src/content/posts/${entry.id}.md`,
				alias: entry.route.usesAlias
					? entry.route.canonicalSlug
					: undefined,
			})),
		);

		const paths = buildCanonicalPostPaths(posts, routes);
		expect(paths.map(({ route }) => route.canonicalSlug)).toEqual([
			"plain",
			"canonical-name",
		]);
		expect(paths.map(({ route }) => route.canonicalSlug)).not.toContain(
			"legacy-name",
		);
	});
});
