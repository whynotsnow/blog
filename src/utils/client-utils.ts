/*
此文件需要保持 client-utils 的特点不要污染构建阶段的Api或者函数，例如不要引入
import { type CollectionEntry, getCollection } from "astro:content";
*/

export type PostNavigatorCategory = {
	slug: string;
	name: string;
	count: number;
	tags: {
		slug: string;
		name: string;
		count: number;
		url: string;
	}[];
};

export function toSlug(str: string) {
	return str.toLowerCase().trim().replace(/\s+/g, "-");
}

export function url(path: string): string {
	const base = import.meta.env.BASE_URL ?? "/";
	// 移除 base 末尾的斜杠（如果有）
	const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
	// 确保 path 以斜杠开头（方便拼接）
	const normalizedPath = path.startsWith("/") ? path : "/" + path;
	// 拼接并返回
	return normalizedBase + normalizedPath;
}

export function getTagUrl(tag: string): string {
	if (!tag) return url("/archive/");
	return url(`/archive/?tag=${tag.trim()}`);
}

const HIDDEN = -1; // 用于表示省略号
const ADJ_DIST = 2; // 每侧显示的页码数（控制可见总数）

export { HIDDEN, ADJ_DIST };

/**
 * 生成分页页码数组（包含页码和省略号标记）
 * @param currentPage 当前页码
 * @param lastPage 最后一页页码
 * @param adjDist 当前页两侧显示的页码数量（默认为2，总可见数为 adjDist*2+1）
 * @returns 包含页码和 HIDDEN 标记的数组
 */
export function generatePages(
	currentPage: number,
	lastPage: number,
	adjDist: number = ADJ_DIST,
): (number | typeof HIDDEN)[] {
	const visible = adjDist * 2 + 1; // 期望显示的总页码数（不含省略号占位）
	let count = 1; // 已计入的页码数量（从当前页开始）
	let l = currentPage; // 左边界页码
	let r = currentPage; // 右边界页码

	// 1. 同时向左右两侧扩展，尽可能保持对称
	while (0 < l - 1 && r + 1 <= lastPage && count + 2 <= visible) {
		count += 2;
		l--;
		r++;
	}
	// 2. 若左侧还有空间且未达到 visible，继续向左扩展
	while (0 < l - 1 && count < visible) {
		count++;
		l--;
	}
	// 3. 若右侧还有空间且未达到 visible，继续向右扩展
	while (r + 1 <= lastPage && count < visible) {
		count++;
		r++;
	}

	// 构建最终页码数组，处理首页、末页和省略号
	let pages: (number | typeof HIDDEN)[] = [];
	if (l > 1) pages.push(1); // 显示首页
	if (l === 3) pages.push(2); // 当左边界为3时，第二页可直接显示（避免孤立省略号）
	if (l > 3) pages.push(HIDDEN); // 左侧有较大间隙时插入省略号
	for (let i = l; i <= r; i++) pages.push(i); // 中间连续页码
	if (r < lastPage - 2) pages.push(HIDDEN); // 右侧有较大间隙时插入省略号
	if (r === lastPage - 2) pages.push(lastPage - 1); // 右边界接近末页时直接显示倒数第二页
	if (r < lastPage) pages.push(lastPage); // 显示最后一页

	return pages;
}
