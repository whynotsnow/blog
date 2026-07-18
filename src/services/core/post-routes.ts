import { url } from "@/utils/client-utils";
import type { PostRoute, PostRouteIndex, PostRouteSource } from "./types";

const FORBIDDEN_ALIAS_CHARACTER_PATTERN = /[?#\\]/;

export class PostRouteValidationError extends Error {
	readonly issues: readonly string[];

	constructor(issues: readonly string[]) {
		super(
			`Post route validation failed:\n\n${issues.map((issue) => `- ${issue}`).join("\n")}`,
		);
		this.name = "PostRouteValidationError";
		this.issues = issues;
	}
}

function describePost(post: PostRouteSource): string {
	return post.filePath ?? post.id;
}

function decodeSlug(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		throw new Error("contains invalid percent encoding");
	}
}

function validateSlugSegments(value: string): void {
	if (
		Array.from(value).some((character) => {
			const codePoint = character.codePointAt(0) ?? 0;
			return codePoint <= 0x1f || codePoint === 0x7f;
		})
	) {
		throw new Error("contains control characters");
	}

	if (FORBIDDEN_ALIAS_CHARACTER_PATTERN.test(value)) {
		throw new Error("contains a query, hash, or backslash");
	}

	const segments = value.split("/");
	if (segments.some((segment) => segment.length === 0)) {
		throw new Error("contains an empty path segment");
	}

	if (segments.some((segment) => segment === "." || segment === "..")) {
		throw new Error('contains a forbidden "." or ".." path segment');
	}
}

/**
 * Normalize a post route fragment without coupling presentation code to alias rules.
 */
export function normalizePostSlug(value: string): string {
	if (typeof value !== "string") {
		throw new Error("must be a string");
	}

	let normalized = value
		.trim()
		.normalize("NFC")
		.replace(/^\/+|\/+$/g, "");
	if (/^posts\//i.test(normalized)) {
		normalized = normalized.replace(/^posts\//i, "");
	}

	if (!normalized) {
		throw new Error("must not be empty");
	}

	validateSlugSegments(normalized);
	validateSlugSegments(decodeSlug(normalized).normalize("NFC"));

	return normalized;
}

function buildDefaultSlug(post: PostRouteSource): string {
	return normalizePostSlug(post.id.replace(/\.(md|mdx|markdown)$/i, ""));
}

export function buildPostRoute(post: PostRouteSource): PostRoute {
	const defaultSlug = buildDefaultSlug(post);
	const alias = post.alias?.trim();
	const canonicalSlug = alias ? normalizePostSlug(alias) : defaultSlug;

	return {
		postId: post.id,
		defaultSlug,
		canonicalSlug,
		canonicalUrl: url(`/posts/${canonicalSlug}/`),
		usesAlias: Boolean(alias),
	};
}

function collisionKey(slug: string): string {
	return decodeSlug(slug).normalize("NFC").toLocaleLowerCase("en-US");
}

function pushBucket(
	buckets: Map<string, PostRouteSource[]>,
	slug: string,
	post: PostRouteSource,
): void {
	const key = collisionKey(slug);
	const matches = buckets.get(key) ?? [];
	matches.push(post);
	buckets.set(key, matches);
}

function describeMatches(posts: readonly PostRouteSource[]): string {
	return posts.map(describePost).join(", ");
}

export function validatePostRoutes(posts: readonly PostRouteSource[]): void {
	const issues: string[] = [];
	const validRoutes = new Map<string, PostRoute>();
	const defaultBuckets = new Map<string, PostRouteSource[]>();
	const aliasBuckets = new Map<string, PostRouteSource[]>();

	for (const post of posts) {
		try {
			const route = buildPostRoute(post);
			validRoutes.set(post.id, route);
			pushBucket(defaultBuckets, route.defaultSlug, post);
			if (route.usesAlias)
				pushBucket(aliasBuckets, route.canonicalSlug, post);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : String(error);
			issues.push(
				`${describePost(post)}: invalid post route (${message})`,
			);
		}
	}

	for (const postsWithDefault of defaultBuckets.values()) {
		if (postsWithDefault.length < 2) continue;
		const route = validRoutes.get(postsWithDefault[0].id);
		issues.push(
			`default slug "${route?.defaultSlug}" is shared by ${describeMatches(postsWithDefault)}`,
		);
	}

	for (const postsWithAlias of aliasBuckets.values()) {
		const route = validRoutes.get(postsWithAlias[0].id);
		if (postsWithAlias.length > 1) {
			issues.push(
				`alias "${route?.canonicalSlug}" is shared by ${describeMatches(postsWithAlias)}`,
			);
		}

		const defaults = defaultBuckets.get(
			collisionKey(route?.canonicalSlug ?? ""),
		);
		if (defaults?.length) {
			issues.push(
				`alias "${route?.canonicalSlug}" from ${describeMatches(postsWithAlias)} conflicts with the default slug of ${describeMatches(defaults)}`,
			);
		}
	}

	if (issues.length > 0) throw new PostRouteValidationError(issues);
}

export function buildPostRouteIndex(
	posts: readonly PostRouteSource[],
): PostRouteIndex {
	validatePostRoutes(posts);

	const byId = new Map<string, PostRoute>();
	const bySlug = new Map<string, PostRoute>();
	for (const post of posts) {
		const route = buildPostRoute(post);
		byId.set(post.id, route);
		bySlug.set(collisionKey(route.canonicalSlug), route);
	}

	return { byId, bySlug };
}
