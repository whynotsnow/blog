<script lang="ts">
  import { toSlug, url } from "@utils/client-utils";

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
  export let currentCategory: string | undefined = undefined;
  export let currentTag: string | undefined = undefined;

  const categorySlug = toSlug(currentCategory || "");
  const tagSlug = toSlug(currentTag || "");

  $: activeCategory = categories.find((c) => c.slug === categorySlug) ?? undefined;

  const isActiveCategory = (slug: string) => slug === categorySlug;
  const isActiveTag = (slug: string) => slug === tagSlug;
</script>

<nav class="post-taxonomy-nav mb-4">
  <!-- ================= 统一 Card ================= -->
  <div class="rounded-xl bg-[var(--card-bg-transparent)] p-4">
    <!-- ================= 面包屑 ================= -->
    <div
      class="flex items-center gap-2 text-sm font-medium mb-4"
      style="color: var(--content-meta);"
    >
      <a href={url("/")} class="transition hover:text-[var(--primary)] font-semibold"> 全部分类 </a>

      {#if activeCategory}
        <span class="opacity-40">›</span>

        <a
          href={url(`/category/${activeCategory.slug}/`)}
          class="transition hover:text-[var(--primary)] font-semibold"
        >
          {activeCategory.name}
        </a>
      {/if}

      {#if currentTag}
        <span class="opacity-40">›</span>

        <span class="text-[var(--primary)] font-semibold">
          # {currentTag}
        </span>
      {/if}
    </div>

    <!-- ================= 分类按钮组 ================= -->
    <div class="flex flex-wrap gap-2">
      {#each categories as cat}
        <div
          class="relative group text-[var(--btn-content)]"
          class:text-white={isActiveCategory(cat.slug)}
        >
          <a
            href={url(`/category/${cat.slug}/`)}
            class="btn-regular h-8 text-sm px-3 rounded-lg transition"
            class:bg-[var(--primary)]={isActiveCategory(cat.slug)}
            class:pointer-events-none={isActiveCategory(cat.slug)}
            class:hover:bg-[var(--btn-regular-bg-hover)]={!isActiveCategory(cat.slug)}
            aria-current={isActiveCategory(cat.slug) ? "page" : undefined}
          >
            {cat.name}
          </a>

          <!-- 角标（完全继承文字颜色） -->
          <span
            class="absolute -top-1 -right-1
                   min-w-[1.2rem] h-5 px-1
                   rounded-full
                   text-xs leading-5 text-center
                   pointer-events-none
                   transition"
            class:bg-[var(--primary)]={isActiveCategory(cat.slug)}
            class:bg-[var(--btn-regular-bg)]={!isActiveCategory(cat.slug)}
            class:group-hover:bg-[var(--btn-regular-bg-hover)]={!isActiveCategory(cat.slug)}
          >
            {cat.count}
          </span>
        </div>
      {/each}
    </div>

    <!-- ================= 当前分类 Tags ================= -->
    {#if activeCategory}
      <div class="mt-5 pt-4 border-t border-[var(--line-divider)]">
        <div class="flex flex-wrap gap-2">
          {#each activeCategory.tags as tag}
            <div
              class="relative group text-[var(--btn-content)]"
              class:text-white={isActiveTag(tag.slug)}
            >
              <a
                href={url(`/category/${activeCategory.slug}/?tag=${tag.slug}`)}
                class="btn-regular h-7 text-xs px-2 rounded-lg transition"
                class:bg-[var(--primary)]={isActiveTag(tag.slug)}
                class:pointer-events-none={isActiveTag(tag.slug)}
                class:hover:bg-[var(--btn-regular-bg-hover)]={!isActiveTag(tag.slug)}
                aria-current={isActiveTag(tag.slug) ? "page" : undefined}
              >
                # {tag.name}
              </a>

              <!-- 角标（完全继承文字颜色） -->
              <span
                class="absolute -top-1 -right-1
                       min-w-[1rem] h-4 px-1
                       rounded-full
                       text-[9px] leading-4 text-center
                       pointer-events-none
                       transition"
                class:bg-[var(--primary)]={isActiveTag(tag.slug)}
                class:bg-[var(--btn-regular-bg)]={!isActiveTag(tag.slug)}
                class:group-hover:bg-[var(--btn-regular-bg-hover)]={!isActiveTag(tag.slug)}
              >
                {tag.count}
              </span>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</nav>
