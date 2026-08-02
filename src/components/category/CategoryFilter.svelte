<script lang="ts">
	import type { PostNavigatorCategory } from "@/services/core/types";
	import { url } from "@utils/url";

	export let categories: PostNavigatorCategory[];
	export let categorySlug: string;
	export let currentTag: string | undefined = undefined;
	export let resultCount: number;

	$: activeCategory = categories.find(
		(category) => category.slug === categorySlug,
	);
	$: activeTag = activeCategory?.tags.find((tag) => tag.slug === currentTag);
</script>

<section
	class="category-filter ds-surface-card"
	aria-labelledby="category-filter-title"
>
	<div
		class="ds-cluster justify-between"
		style="--cluster-space: var(--space-cluster);"
	>
		<div>
			<h1
				id="category-filter-title"
				class="category-filter__title font-bold text-(--text-primary)"
			>
				{activeCategory?.name ?? "文章分类"}
			</h1>
			<p class="category-filter__summary mt-1 text-(--text-secondary)">
				{#if activeTag}# {activeTag.name} ·
				{/if}{resultCount} 篇文章
			</p>
		</div>
		<details class="category-filter__mobile">
			<summary
				class="category-filter__summary-action cursor-pointer rounded-(--radius-md) border border-(--border-default) px-3 py-2 font-semibold text-(--text-primary)"
			>
				筛选
			</summary>
		</details>
	</div>

	<div class="category-filter__options mt-4">
		<div class="ds-cluster" style="--cluster-space: var(--size-2);">
			{#each categories as category (category.slug)}
				<a
					href={url(`/category/${category.slug}/`)}
					aria-current={category.slug === categorySlug
						? "page"
						: undefined}
					class={`category-filter__category rounded-(--radius-md) border px-3 py-2 font-semibold transition ${
						category.slug === categorySlug
							? "border-(--accent) bg-(--accent) text-(--text-on-accent)"
							: "border-(--border-subtle) text-(--text-secondary) hover:border-(--border-strong) hover:text-(--accent)"
					}`}
				>
					{category.name}
					<span class="opacity-70">{category.count}</span>
				</a>
			{/each}
		</div>

		{#if activeCategory && activeCategory.tags.length > 0}
			<div class="mt-4 border-t border-(--border-subtle) pt-4">
				<div class="ds-cluster" style="--cluster-space: var(--size-2);">
					<a
						href={url(`/category/${activeCategory.slug}/`)}
						aria-current={!currentTag ? "page" : undefined}
						class={`category-filter__tag rounded-(--radius-md) px-2.5 py-1.5 font-semibold transition ${
							!currentTag
								? "bg-(--accent) text-(--text-on-accent)"
								: "text-(--text-secondary) hover:text-(--accent)"
						}`}
					>
						全部标签
					</a>
					{#each activeCategory.tags as tag (tag.slug)}
						<a
							href={url(
								`/category/${activeCategory.slug}/?tag=${tag.slug}`,
							)}
							aria-current={currentTag === tag.slug
								? "page"
								: undefined}
							class={`category-filter__tag rounded-(--radius-md) px-2.5 py-1.5 font-semibold transition ${
								currentTag === tag.slug
									? "bg-(--accent) text-(--text-on-accent)"
									: "text-(--text-secondary) hover:text-(--accent)"
							}`}
						>
							# {tag.name}
							<span class="opacity-70">{tag.count}</span>
						</a>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</section>

<style>
	.category-filter {
		padding: clamp(1rem, 2cqi, 1.25rem);
	}

	.category-filter__title {
		font-size: 1.25rem;
	}

	.category-filter__summary,
	.category-filter__summary-action,
	.category-filter__category {
		font-size: 0.875rem;
	}

	.category-filter__tag {
		font-size: 0.75rem;
	}

	.category-filter__mobile {
		display: none;
	}

	@container post-feed (max-width: 607px) {
		.category-filter__mobile {
			display: block;
		}

		.category-filter__options {
			display: none;
		}

		.category-filter:has(details[open]) .category-filter__options {
			display: block;
		}
	}
</style>
