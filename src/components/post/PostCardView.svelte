<script lang="ts">
	import Icon from "@iconify/svelte";
	import type { UIPost } from "./types";
	import { siteConfig } from "@/config";
	import ImageWrapper from "./ImageWrapper.svelte";

	// ========= props =========
	export let post: UIPost;
	export let className = "";
	export let style: string | undefined = undefined;

	// ========= 派生数据 =========
	const hasCover = !!post.image?.src;
	const coverWidth = "28%";

	const url = post.url;

	// data-tags
	const dataTags = post.tags?.map((t) => t.name).join(",") ?? "";
</script>

<div
	class={`post-item card-base flex flex-col-reverse md:flex-col w-full
    rounded-(--radius-large) overflow-hidden relative ${className}`}
	style={`--coverWidth:${coverWidth}; ${style ?? ""}`}
	data-tags={dataTags}
>
	<!-- ================= 内容区域 ================= -->
	<div
		class={`pl-6 md:pl-9 pr-6 md:pr-2 pt-6 md:pt-7 pb-6 relative
      ${
			!hasCover
				? "w-full md:w-[calc(100%-3.25rem-0.75rem)]"
				: "w-full md:w-[calc(100%-var(--coverWidth)-0.75rem)]"
		}`}
	>
		<!-- ================= 标题 ================= -->
		<a
			href={url}
			class="transition group w-full block font-bold mb-3 text-3xl text-90
        hover:text-(--primary)
        active:text-(--title-active)
        before:w-1 before:h-5 before:rounded-md before:bg-(--primary)
        before:absolute
        before:top-8.75 before:left-4.5
        before:hidden md:before:block"
		>
			{#if post.pinned}
				<Icon
					icon="mdi:pin"
					class="inline text-(--primary) text-2xl mr-2 -translate-y-0.5"
				/>
			{/if}

			{post.title}

			<!-- 移动端箭头 -->
			<Icon
				icon="material-symbols:chevron-right-rounded"
				class="inline text-[2rem] text-(--primary) md:hidden
          translate-y-0.5 absolute"
			/>

			<!-- 桌面 hover 箭头 -->
			<Icon
				icon="material-symbols:chevron-right-rounded"
				class="text-(--primary) text-[2rem] transition hidden md:inline absolute
          translate-y-0.5 opacity-0 group-hover:opacity-100
          -translate-x-1 group-hover:translate-x-0"
			/>
		</a>

		<!-- ================= Meta ================= -->

		<!-- ================= 描述 ================= -->
		<div
			class={`transition text-75 mb-3.5 pr-4
        ${!post.description ? "line-clamp-2 md:line-clamp-1" : ""}`}
		>
			{post.description ?? post.meta?.excerpt ?? ""}
		</div>

		<!-- ================= 标签 ================= -->
		<div class="flex flex-wrap gap-2 mt-2">
			{#if post.tags && post.tags.length > 0}
				{#each post.tags as tag}
					<a
						href={tag.url}
						class={siteConfig.tagStyle?.useNewStyle
							? "link-lg transition text-50 text-xs font-medium px-2 py-1 rounded-lg hover:text-(--primary) active:text-(--primary) whitespace-nowrap"
							: "btn-regular h-6 text-xs px-2 rounded-lg"}
						aria-label={`View all posts tagged with ${tag.name}`}
					>
						<span
							class="transition-transform group-hover/tag:translate-x-0.5"
						>
							# {tag.name}
						</span>
					</a>
				{/each}
			{:else}
				<span class="text-xs text-50">No tags</span>
			{/if}
		</div>
	</div>

	<!-- ================= 封面区域 ================= -->
	{#if hasCover}
		<a
			href={url}
			aria-label={post.title}
			class="group
        max-h-[20vh] md:max-h-none
        mx-4 mt-4 -mb-2 md:mb-0 md:mx-0 md:mt-0
        md:w-(--coverWidth)
        relative md:absolute md:top-3 md:bottom-3 md:right-3
        rounded-xl overflow-hidden active:scale-95"
		>
			<!-- hover 蒙层 -->
			<div
				class="absolute pointer-events-none z-10 w-full h-full
        group-hover:bg-black/30 group-active:bg-black/50 transition"
			></div>

			<!-- 中心箭头 -->
			<div
				class="absolute pointer-events-none z-20 w-full h-full
        flex items-center justify-center"
			>
				<Icon
					icon="material-symbols:chevron-right-rounded"
					class="transition opacity-0 group-hover:opacity-100
            scale-50 group-hover:scale-100 text-white text-5xl"
				/>
			</div>

			<ImageWrapper
				src={post.image}
				alt="Cover Image of the Post"
				className="w-full h-full"
				loading="lazy"
			/>
		</a>
	{/if}

	<!-- ================= 无封面按钮 ================= -->
	{#if !hasCover}
		<a
			href={url}
			aria-label={post.title}
			class="hidden! md:flex! btn-regular w-13
        absolute right-3 top-3 bottom-3 rounded-xl
        bg-(--enter-btn-bg)
        hover:bg-(--enter-btn-bg-hover)
        active:bg-(--enter-btn-bg-active) active:scale-95"
		>
			<Icon
				icon="material-symbols:chevron-right-rounded"
				class="transition text-(--primary) text-4xl mx-auto"
			/>
		</a>
	{/if}
</div>

<!-- 移动端分割线 -->
<div
	class="transition border-t border-dashed mx-6
    border-black/10 dark:border-white/15
    last:border-t-0 md:hidden"
></div>
