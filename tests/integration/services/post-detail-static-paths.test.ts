import { describe, expect, it } from "vitest";
import { buildPostRouteIndex } from "@/services/core/post-routes";
import type { ListPost } from "@/services/core/types";
import { buildCanonicalPostPaths } from "@/services/post-detail/static-paths";

function post(id: string, alias?: string): ListPost {
	return {
		id,
		filePath: `src/content/posts/${id}.md`,
		data: { alias },
	} as ListPost;
}

describe("post detail canonical static paths", () => {
	it("returns exactly one canonical path for each post", () => {
		const posts = [post("plain"), post("legacy-name", "canonical-name")];
		const routes = buildPostRouteIndex(
			posts.map((entry) => ({
				id: entry.id,
				filePath: entry.filePath,
				alias: entry.data.alias,
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
