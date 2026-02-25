<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import type { UIPost } from "./useCategoryPagination";
  import { siteConfig } from "@/config";
  import { widgetManager } from "@/utils/widget-manager";
  import PostCardView from "./PostCardView.svelte";
	import type { PostNavigatorCategory } from "@utils/client-utils";
	import PostTaxonomyNav from "./PostTaxonomyNav.svelte";

  export let posts: UIPost[];
  export let categories: PostNavigatorCategory[];
  export let categorySlug: string;
  export let tag: string | undefined = undefined;

  let container: HTMLDivElement | null = null;

  /* ================= 侧边栏检测 ================= */

  const hasRightSidebars =
    widgetManager.getComponentsByPosition("top", "right", "desktop").length > 0 ||
    widgetManager.getComponentsByPosition("sticky", "right", "desktop").length > 0;

  /* ================= 默认布局 ================= */

  const defaultLayout: "grid" | "list" =
    siteConfig.postListLayout.defaultMode === "grid" ? "grid" : "list";

  /* ================= 核心逻辑 ================= */

  function updatePostListLayout(layout: "grid" | "list") {
    if (!container) return;

    container.classList.add("layout-switching");

    if (layout === "grid") {
      container.classList.remove("list-mode");
      container.classList.add("grid-mode");

      document
        .getElementById("main-grid")
        ?.setAttribute("data-layout-mode", "grid");

      document
        .querySelector(".left-sidebar-container")
        ?.classList.add("hidden-in-grid-mode");

    } else {
      container.classList.remove("grid-mode");
      container.classList.add("list-mode");

      document
        .getElementById("main-grid")
        ?.setAttribute("data-layout-mode", "list");

      document
        .querySelector(".left-sidebar-container")
        ?.classList.remove("hidden-in-grid-mode");
    }

    container.classList.add("js-initialized");

    setTimeout(() => {
      container?.classList.remove("layout-switching");
    }, 500);
  }

  function publishLayoutInit() {
    if (!container) return;

    const layout = container.classList.contains("grid-mode")
      ? "grid"
      : "list";

    window.dispatchEvent(
      new CustomEvent("layoutInit", { detail: { layout } })
    );
  }

  function initLayout() {
    requestAnimationFrame(() => {
      if (!container) return;

      const savedLayout = localStorage.getItem("postListLayout") as
        | "grid"
        | "list"
        | null;

      const layout = savedLayout || defaultLayout;

      const hasGridClass = container.classList.contains("grid-mode");

      const isCorrect =
        (layout === "grid" && hasGridClass) ||
        (layout === "list" && !hasGridClass);

      if (isCorrect) {
        container.classList.add("js-initialized");
        publishLayoutInit();
        return;
      }

      if (window.innerWidth >= 769) {
        updatePostListLayout(layout);
      } else {
        container.classList.add("js-initialized");
      }

      publishLayoutInit();
    });
  }

  /* ================= Resize 防抖 ================= */

  let resizeTimeout: number;

  function handleResize() {
    clearTimeout(resizeTimeout);

    resizeTimeout = window.setTimeout(() => {
      if (window.innerWidth >= 769) {
        const saved =
          (localStorage.getItem("postListLayout") as "grid" | "list") ||
          defaultLayout;

        updatePostListLayout(saved);
      }
    }, 100);
  }

  /* ================= layoutChange 监听 ================= */

  function handleLayoutChange(e: Event) {
    const detail = (e as CustomEvent).detail;
    if (detail?.layout) {
      updatePostListLayout(detail.layout);
    }
  }

  /* ================= Swup 集成 ================= */

  function setupSwupListeners() {
    const swup = (window as any).swup;

    if (!swup) return;

    swup.hooks.on("content:replace", initLayout);
  }

  /* ================= 生命周期 ================= */

  onMount(() => {
    initLayout();

    window.addEventListener("resize", handleResize);
    window.addEventListener("layoutChange", handleLayoutChange);

    setTimeout(setupSwupListeners, 200);
    setTimeout(publishLayoutInit, 150);
  });

  onDestroy(() => {
    window.removeEventListener("resize", handleResize);
    window.removeEventListener("layoutChange", handleLayoutChange);
  });

</script>

<div id="page-content">

  <PostTaxonomyNav
    categories={categories}
    currentCategory={categorySlug}
    currentTag={tag}
  />

  <div
    bind:this={container}
    id="post-list-container"
    class="transition-all duration-500 ease-in-out rounded-[var(--radius-large)] bg-[var(--card-bg)] md:bg-transparent mb-4"
    class:grid-mode={defaultLayout === "grid"}
    class:list-mode={defaultLayout !== "grid"}
    data-default-layout={defaultLayout}
    data-both-sidebars={hasRightSidebars}
  >
    {#each posts as post}
      <PostCardView
        post={post}
        className="onload-animation"
      />
    {/each}
  </div>
</div>

<style>
  #post-list-container {
    min-height: 200px;
    transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }

  #post-list-container.list-mode {
    @apply flex flex-col gap-4;
  }

  #post-list-container.grid-mode {
    @apply grid grid-cols-1 md:grid-cols-2 gap-6;
  }

  #post-list-container > :global(*) {
    content-visibility: auto;
    contain-intrinsic-size: 200px;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    opacity: 0;
    animation: fadeInSlide 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    animation-delay: calc(var(--content-delay) + var(--i) * var(--interval));
  }

  #post-list-container.grid-mode > :global(*) {
    animation-name: fadeInScale;
  }

  #post-list-container.layout-switching {
    opacity: 0.95;
  }

  #post-list-container.layout-switching > :global(*) {
    animation-delay: calc(var(--i) * 50ms);
    transform: scale(0.98);
  }

  @keyframes fadeInScale {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes fadeInSlide {
    from {
      opacity: 0;
      transform: translateX(-10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

</style>
