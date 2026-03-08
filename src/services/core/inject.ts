import { render } from "astro:content";
import { getTagUrl } from "@/utils/client-utils";
import {
	generateCategorySlug,
	generateTagSlug,
	getCategoryUrl,
	getPostUrl,
	removeFileExtension,
	resolveImageUrl,
} from "@/utils/url-utils";
import { UNCATEGORIZED } from "@constants/constants";
import type { RawPost, ListPost, UIPost, PostMeta } from "./types";
import { calculateRecommendScore } from "./sort";

type BaseMeta = {
	postId: number;
};

type ContentMeta = {
	words: number;
	excerpt: string;
	minutes: number;
};

type ScoreMeta = {
	score: number;
};

type ListMeta = ContentMeta & ScoreMeta;

type NavigationMeta = {
	prevSlug?: string;
	prevTitle?: string;
	nextSlug?: string;
	nextTitle?: string;
};

export type PostWithSystemMeta = RawPost & {
	meta: BaseMeta;
};

export type PostWithListMeta = RawPost & {
	meta: BaseMeta & ContentMeta & ScoreMeta;
};

export async function renderPost(entry) {
	const result = await render(entry);
	return {
		...result,
		remarkPluginFrontmatter: result.remarkPluginFrontmatter as {
			words?: number;
			minutes?: number;
			excerpt?: string;
		},
	};
}

/**
 * 为每篇文章生成顺序 ID（用于 permalink）
 */
export function injectSystemMeta(posts: RawPost[]): PostWithSystemMeta[] {
	const idMap = new Map<string, number>();

	posts.forEach((post, index) => {
		idMap.set(post.id, index + 1);
	});

	return posts.map((post) => ({
		...post,
		meta: {
			postId: idMap.get(post.id)!,
		},
	}));
}

export async function injectListMeta(
	posts: PostWithSystemMeta[],
): Promise<PostWithListMeta[]> {
	return Promise.all(
		posts.map(async (post) => {
			const { remarkPluginFrontmatter } = await renderPost(post);

			const score = calculateRecommendScore(post);

			return {
				...post,
				meta: {
					...post.meta,
					words: remarkPluginFrontmatter.words ?? 0,
					excerpt: remarkPluginFrontmatter.excerpt ?? "",
					minutes: remarkPluginFrontmatter.minutes ?? 0,
					score,
				},
			};
		}),
	);
}

export function injectNavigationMeta(posts: PostWithListMeta[]): ListPost[] {
	const map = new Map<string, NavigationMeta>();

	for (let i = 1; i < posts.length; i++) {
		map.set(posts[i].id, {
			nextSlug: removeFileExtension(posts[i - 1].id),
			nextTitle: posts[i - 1].data.title,
		});
	}

	for (let i = 0; i < posts.length - 1; i++) {
		const prev = map.get(posts[i].id) ?? {};

		map.set(posts[i].id, {
			...prev,
			prevSlug: removeFileExtension(posts[i + 1].id),
			prevTitle: posts[i + 1].data.title,
		});
	}

	return posts.map((post) => ({
		...post,
		meta: {
			...post.meta,
			...map.get(post.id),
		},
	}));
}

// 构建分类信息的函数
export function buildCategoryItems(category: string): {
	slug: string;
	name: string;
	url: string;
} {
	const slug = generateCategorySlug(category);
	return {
		name: category.trim() || UNCATEGORIZED,
		slug,
		url: getCategoryUrl(slug),
	};
}

// 构建标签列表的函数
export function buildTagItems(tags: string[]): {
	slug: string;
	name: string;
	url: string;
}[] {
	return (tags ?? [])
		.map((t: string) => {
			const slug = generateTagSlug(t);
			return {
				name: t.trim(),
				slug,
				url: getTagUrl(slug),
			};
		})
		.sort((a, b) => a.name.localeCompare(b.name));
}

/* =========================
   Raw → UIPost
========================= */

export function toUIPost(post: ListPost): UIPost {
	const { id, data, filePath, meta } = post;
	const { words, excerpt, score, minutes } = meta;

	const imageUrl = resolveImageUrl(post);

	const category = buildCategoryItems(data.category);
	const tags = buildTagItems(data.tags);
	const ui: UIPost = {
		id,
		slug: category.slug,
		url: getPostUrl(post),

		title: data.title,
		description: data.description,

		published: data.published,
		updated: data.updated,
		pinned: data.pinned,

		category,
		tags,

		meta: {
			id,
			published: data.published,
			updated: data.updated,
			category,
			tags,
			words,
			excerpt,
		},

		hasCoverImage: Boolean(data.image),
		image: imageUrl,

		filePath,
		source: "client",
	};

	// 开发时可查看所有字段
	if (import.meta.env.DEV) {
		ui._dev = {
			_listPost: post,
			_words: words,
			_score: score,
			_excerpt: excerpt,
			_minutes: minutes,
		};
	}

	return ui;
}
