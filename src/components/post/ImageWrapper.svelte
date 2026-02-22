<script lang="ts">
  /**
   * Runtime Image Wrapper
   *
   * Supports:
   * - string URL
   * - Astro ImageMetadata object
   */

  export let src: string | { src: string; width?: number; height?: number } | undefined;
  export let alt: string = "";
  export let position: string = "center";
  export let className: string = "";
  export let loading: "eager" | "lazy" = "lazy";

  // 统一解析 src
  $: finalSrc =
    typeof src === "string"
      ? src
      : typeof src === "object" && src !== null
      ? src.src
      : "";
  $: width =
    typeof src === "object" ? src.width : undefined;

  $: height =
    typeof src === "object" ? src.height : undefined;

  $: aspectRatio =
    width && height ? `${width} / ${height}` : undefined;

  const imageClass = "w-full h-full object-cover";
  $: imageStyle = `object-position: ${position}`;

  $: isBilibiliImage =
    typeof finalSrc === "string" &&
    finalSrc.includes("hdslb.com");
</script>

{#if finalSrc}
  <div
    class={`overflow-hidden relative ${className}`} 
    style={aspectRatio ? `aspect-ratio: ${aspectRatio};` : ""}
  >
    <div
      class="transition absolute inset-0 dark:bg-black/10 bg-opacity-50 pointer-events-none"
    ></div>

    <img
      src={finalSrc}
      alt={alt}
      class={imageClass}
      style={imageStyle}
      loading={loading}
      {...(isBilibiliImage
        ? {
            referrerpolicy: "no-referrer",
            crossorigin: "anonymous",
          }
        : {})}
    />
  </div>
{/if}