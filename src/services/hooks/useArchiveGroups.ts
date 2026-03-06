import type { ArchiveGroup } from "@/services/archive";

export interface ArchiveFilter {
	tag?: string | null;
	category?: string | null;
	uncategorized?: boolean;
}

export function useArchiveGroups(
	groups: ArchiveGroup[],
	filter: ArchiveFilter,
): ArchiveGroup[] {
	const { tag, category, uncategorized } = filter;

	if (!tag && !category && !uncategorized) {
		return groups;
	}

	const result: ArchiveGroup[] = [];

	for (const group of groups) {
		const posts = group.posts.filter((post) => {
			if (tag) {
				return post.data.tags.some((t) => t.slug === tag);
			}

			if (category) {
				return post.data.category?.slug === category;
			}

			if (uncategorized) {
				return !post.data.category;
			}

			return true;
		});

		if (posts.length > 0) {
			result.push({
				year: group.year,
				posts,
			});
		}
	}

	return result;
}
