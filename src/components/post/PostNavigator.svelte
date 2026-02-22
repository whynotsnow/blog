<script lang="ts">
  import BezierEasing from "bezier-easing";
	import { onMount } from "svelte";

  interface TagItem {
    name: string;
    slug: string;
    count: number;
  }

  interface CategoryItem {
    name: string;
    slug: string;
    count: number;
    tags: TagItem[];
  }

  export let categories: CategoryItem[] = [];

  let activeCategory: string | null = null;

  function onCategoryChange(slug: string | null) {
    activeCategory = slug;
  }

  // Toggle category active status
  function toggleCategory(slug: string) {
    const next = activeCategory === slug ? null : slug;
    onCategoryChange(next);
  }


  // Transition function
  const materialTransition = (node: HTMLElement, { duration = 500 }) => {
    const height = node.scrollHeight;
    return {
      duration,
      easing: BezierEasing(0.4, 0, 0.2, 1),
      css: (t: number) => `
        overflow: hidden;
        max-height: ${t * height}px;
        opacity: ${t};
        transform: translateY(${(1 - t) * -8}px);
      `
    };
  };

  onMount(() => {
    const path = window.location.pathname;
    const match = path.match(/\/category\/([^/]+)/);
    if (match) {
      activeCategory = match[1];
    }
  });
</script>

<nav class="post-navigator mb-4 rounded-xl border border-gray-200 bg-white p-4">
  <ul class="categories flex flex-wrap gap-2">
    {#each categories as cat}
      <li class="relative">
        <button
          type="button"
          class="category-btn btn-regular h-8 px-3 pr-6 rounded-lg text-sm
                 inline-flex items-center transition
                 hover:bg-[var(--btn-regular-bg-hover)]
                 {activeCategory === cat.slug ? 'active' : ''}"
          on:click={() => toggleCategory(cat.slug)}
        >
          {cat.name}
          <span
            class="absolute -top-1 -right-1 min-w-[1.2rem] h-5 px-1
                   rounded-full bg-[var(--btn-content)]
                   text-xs leading-5 text-white text-center"
          >
            {cat.count}
          </span>
        </button>
      </li>
    {/each}
  </ul>

  <div class="tag-panels">
    {#each categories as cat}
      {#if activeCategory === cat.slug}
        <div
          class="tag-panel mt-4"
          in:materialTransition={{ duration: 500 }}
          out:materialTransition={{ duration: 500 }}
        >
          <ul class="tags flex flex-wrap gap-2">
            {#each cat.tags as tag}
              <li class="relative overflow-visible">
                <a
                  type="button"
                  class="tag-link btn-regular h-7 px-2 rounded-md text-xs
                         inline-flex items-center
                         transition hover:bg-[var(--btn-regular-bg-hover)]"
                  href={`/category/${cat.slug}/?tag=${tag.slug}`}
                >
                  <span class="opacity-60 mr-0.5">#</span>
                  {tag.name}
                </a>

                <span
                  class="absolute -top-1.5 -right-1.5
                         min-w-[1.1rem] h-4 px-1
                         rounded-full
                         bg-[var(--btn-content)]
                         text-[9px] leading-4
                         text-white text-center
                         shadow-sm"
                >
                  {tag.count}
                </span>
              </li>
            {/each}
          </ul>

          <a
            class="mt-4 inline-block text-sm font-medium text-gray-700 transition hover:text-gray-900"
            href={`/category/${cat.slug}/`}
          >
            查看「{cat.name}」下的全部文章 →
          </a>
        </div>
      {/if}
    {/each}
  </div>
</nav>
