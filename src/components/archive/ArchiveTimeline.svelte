<script lang="ts">
	import I18nKey from "@i18n/i18nKey";
	import { i18n } from "@i18n/translation";
	import type { ArchiveGroup, SlugItem } from "@/services/archive";
	import { filterArchiveGroups } from "./archive-filter";

	export let groups: ArchiveGroup[];

	const url = new URL(window.location.href);

	const tag = url.searchParams.get("tag");
	const category = url.searchParams.get("category");
	const uncategorized = url.searchParams.get("uncategorized");

	const displayGroups = filterArchiveGroups(groups, {
		tag,
		category,
		uncategorized: !!uncategorized,
	});

	function formatDate(date: Date) {
		const month = (date.getMonth() + 1).toString().padStart(2, "0");

		const day = date.getDate().toString().padStart(2, "0");

		return `${month}-${day}`;
	}

	function formatTag(tagList: SlugItem[]) {
		return tagList.map((tag) => `# ${tag.name}`).join(" ");
	}
</script>

<div class="archive-timeline card-base px-8 py-6">
	{#each displayGroups as group (group.year)}
		<div>
			<div class="flex flex-row w-full items-center h-[3.75rem]">
				<div
					class="archive-timeline__year w-[15%] md:w-[10%] transition font-bold text-right text-75"
				>
					{group.year}
				</div>
				<div class="w-[15%] md:w-[10%]">
					<div
						class="h-3 w-3 bg-none rounded-full outline outline-[var(--accent)] mx-auto
                  -outline-offset-[2px] z-50 outline-3"
					></div>
				</div>
				<div class="w-[70%] md:w-[80%] transition text-left text-50">
					{group.posts.length}
					{i18n(
						group.posts.length === 1
							? I18nKey.postCount
							: I18nKey.postsCount,
					)}
				</div>
			</div>

			{#each group.posts as post (post.id)}
				<a
					href={post.url}
					aria-label={post.data.title}
					class="group btn-plain !block h-10 w-full rounded-lg hover:text-[initial]"
				>
					<div
						class="flex flex-row justify-start items-center h-full"
					>
						<!-- date -->
						<div
							class="archive-timeline__date w-[15%] md:w-[10%] transition text-right text-50"
						>
							{formatDate(post.data.published)}
						</div>

						<!-- dot and line -->
						<div
							class="w-[15%] md:w-[10%] relative dash-line h-full flex items-center"
						>
							<div
								class="transition-all mx-auto w-1 h-1 rounded group-hover:h-5
                       bg-[oklch(0.5_0.05_var(--hue))] group-hover:bg-[var(--accent)]
                       outline outline-4 z-50
                       outline-[var(--surface-card)]
                       group-hover:outline-[var(--btn-plain-bg-hover)]
                       group-active:outline-[var(--btn-plain-bg-active)]"
							></div>
						</div>

						<!-- post title -->
						<div
							class="w-[70%] md:max-w-[65%] md:w-[65%] text-left font-bold
                     group-hover:translate-x-1 transition-all group-hover:text-[var(--accent)]
                     text-75 pr-8 whitespace-nowrap overflow-ellipsis overflow-hidden"
						>
							{post.data.title}
						</div>

						<!-- tag list -->
						<div
							class="archive-timeline__tags hidden md:block md:w-[15%] text-left transition
                     whitespace-nowrap overflow-ellipsis overflow-hidden text-30"
						>
							{formatTag(post.data.tags)}
						</div>
					</div>
				</a>
			{/each}
		</div>
	{/each}
</div>

<style>
	.archive-timeline {
		--archive-timeline-year-size: var(--text-list-title-size);
		--archive-timeline-body-size: var(--text-ui-size);
	}

	.archive-timeline__year {
		font-size: var(--archive-timeline-year-size);
	}

	.archive-timeline__date,
	.archive-timeline__tags {
		font-size: var(--archive-timeline-body-size);
	}
</style>
