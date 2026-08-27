export const POSTS_CONTENT_BASE = "./src/content/posts";
export const TEST_POSTS_CONTENT_BASE = "./tests/content/posts";
export const DEVELOPMENT_POSTS_CONTENT_BASE = "./src/.content-dev/posts";

export type BlogContentMode = "production" | "test" | "development";
type BlogContentEnv = {
	BLOG_CONTENT_MODE?: string;
};

export function resolveBlogContentMode(
	env: BlogContentEnv = process.env,
): BlogContentMode {
	const mode = env.BLOG_CONTENT_MODE?.trim();
	if (!mode || mode === "production") return "production";
	if (mode === "test") return "test";
	if (mode === "development") return "development";

	throw new Error(
		`Unsupported BLOG_CONTENT_MODE "${mode}". Use "production", "test", or "development".`,
	);
}

export function resolvePostsContentBase(
	env: BlogContentEnv = process.env,
): string {
	const mode = resolveBlogContentMode(env);
	if (mode === "test") return TEST_POSTS_CONTENT_BASE;
	if (mode === "development") return DEVELOPMENT_POSTS_CONTENT_BASE;
	return POSTS_CONTENT_BASE;
}
