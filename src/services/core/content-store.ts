import type {
	CategoryEntry,
	ContentStore,
	PostIndexEntry,
	PostNavigatorCategory,
	TagItem,
} from "./types";
import { buildPostIndex } from "./source";
import { getTagUrl } from "@utils/url";
import { generateTagSlug, getCategoryUrl } from "./taxonomy";
import { UNCATEGORIZED } from "@constants/constants";

/* Cache the in-flight build as well as the completed store. */
let storePromise: Promise<ContentStore> | undefined;

/**
 * 更新分类的标签计数
 * @param tags - 标签 Map 对象
 * @param tagName - 标签名称
 */
function updateTagCount(tags: Map<string, TagItem>, tagName: string): void {
	const slug = generateTagSlug(tagName);
	const existingTag = tags.get(slug);

	if (existingTag) {
		// 标签已存在，增加计数
		existingTag.count++;
	} else {
		// 创建新标签
		tags.set(slug, {
			name: tagName,
			slug,
			count: 1,
		});
	}
}

/**
 * 构建分类索引结构
 *
 * 遍历所有文章，按分类进行分组，同时统计每个分类下的标签使用情况。
 * 返回分类 Map 和分类导航数据两种格式。
 *
 * @param posts - 文章列表数据
 * @returns 包含分类 Map 和分类导航数据的对象
 */
function buildCategoryTaxonomy(posts: PostIndexEntry[]): {
	categoryMap: Map<string, CategoryEntry>;
	categories: PostNavigatorCategory[];
} {
	// 使用 Map 存储分类数据，key 为分类 slug
	const categoryMap: Map<string, CategoryEntry> = new Map();

	// 第一遍遍历：构建分类和标签索引
	for (const post of posts) {
		// 获取分类信息，默认为 "uncategorized"
		const rawCategory = post.category.name || UNCATEGORIZED;
		const categorySlug = post.category.slug;

		// 获取或创建分类条目
		let categoryEntry = categoryMap.get(categorySlug);
		if (!categoryEntry) {
			categoryEntry = {
				category: {
					name: rawCategory,
					slug: categorySlug,
					count: 0, // 初始计数为0，后续更新
				},
				posts: [],
				tags: new Map(), // 存储该分类下的标签
			};
			categoryMap.set(categorySlug, categoryEntry);
		}

		// 将文章添加到分类中
		categoryEntry.posts.push(post);

		// 更新分类的文章总数
		categoryEntry.category.count++;

		// 处理文章的所有标签
		for (const tag of post.tags) {
			if (tag.name) {
				// 忽略空标签
				updateTagCount(categoryEntry.tags, tag.name);
			}
		}
	}

	// 第二遍遍历：构建导航所需的数据结构
	const categories: PostNavigatorCategory[] = Array.from(categoryMap.values())
		.map((entry) => ({
			slug: entry.category.slug,
			name: entry.category.name,
			count: entry.posts.length,
			url: getCategoryUrl(entry.category.slug),
			// 将标签 Map 转换为数组，并按名称排序
			tags: Array.from(entry.tags.values())
				.map((tag) => ({
					slug: tag.slug,
					name: tag.name,
					count: tag.count,
					url: getTagUrl(tag.name),
				}))
				.sort((a, b) => a.name.localeCompare(b.name, "zh-CN")), // 按标签名排序
		}))
		.sort((a, b) => a.name.localeCompare(b.name, "zh-CN")); // 按分类名排序

	return {
		categoryMap, // 原始分类 Map，用于快速查找
		categories, // 处理后的分类导航数据，用于展示
	};
}

/**
 * 构建内容存储对象
 *
 * 将原始文章数据与分类索引合并，生成完整的内容存储结构。
 * 这是整个内容系统的核心数据模型，包含了所有文章及其分类导航信息。
 *
 * @param posts - 轻量文章索引
 * @param routes - Post Index 构建阶段生成的权威路由索引
 * @returns 完整的内容存储对象，包含文章列表和分类导航数据
 *
 * @example
 * const store = buildContentStore(posts, routes);
 * console.log(store.posts.length); // 文章总数
 * console.log(store.categories); // 分类导航数据
 */
export function buildContentStore(
	posts: PostIndexEntry[],
	routes: ContentStore["routes"],
): ContentStore {
	if (routes.byId.size !== posts.length) {
		throw new Error(
			`Post route index size ${routes.byId.size} does not match post index size ${posts.length}`,
		);
	}
	for (const post of posts) {
		const route = routes.byId.get(post.id);
		if (!route) throw new Error(`Missing post route for ${post.id}`);
		if (route !== post.route) {
			throw new Error(
				`Post route for ${post.id} is not the canonical index entry`,
			);
		}
	}

	const taxonomy = buildCategoryTaxonomy(posts);
	const postsById = new Map(posts.map((post) => [post.id, post]));
	const lastActivityAt = posts.reduce<Date | null>((latest, post) => {
		const activityAt = post.updated ?? post.published;
		return !latest || activityAt > latest ? activityAt : latest;
	}, null);

	return {
		posts,
		postsById,
		routes,
		stats: {
			postCount: posts.length,
			totalWords: posts.reduce((total, post) => total + post.words, 0),
			lastActivityAt,
		},
		...taxonomy,
	};
}

/**
 * 获取内容存储对象的单例
 * 
 * 这是访问内容数据的推荐入口。函数内部实现了缓存机制：
 * - 首次调用时从数据源加载所有文章并构建索引
 * - 后续调用直接返回缓存的存储对象
 * - 在开发环境下会输出构建信息以便调试
 * 
 * @returns Promise 解析为内容存储对象

 * @remarks
 * 在开发环境（DEV）下，每次重新构建都会重新加载数据，
 * 确保你总是能看到最新的内容变更。
 */
export function getContentStore(): Promise<ContentStore> {
	if (storePromise) return storePromise;

	storePromise = buildPostIndex()
		.then(({ posts, routes }) => {
			const store = buildContentStore(posts, routes);
			if (import.meta.env.DEV) {
				console.log("[ContentStore] 构建完成:", {
					posts: posts.length,
					categories: store.categories.length,
				});
			}
			return store;
		})
		.catch((error: unknown) => {
			storePromise = undefined;
			throw error;
		});

	return storePromise;
}

/**
 * 清除内容存储缓存
 * 正常生产环境中通常不需要调用此函数。
 *
 * @internal
 */
export function _clearContentStoreCache(): void {
	storePromise = undefined;
}

if (import.meta.hot) {
	import.meta.hot.dispose(_clearContentStoreCache);
}
