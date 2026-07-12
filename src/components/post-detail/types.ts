import type { ListPost } from "@/services/core/types";
import type { BlogPostingJsonLd } from "@/services/post-detail/types";
import type { MarkdownHeading } from "astro";
import type { AstroComponentFactory } from "astro/runtime/server/index.js";

export interface PostDetailPageProps {
	entry: ListPost;
	Content: AstroComponentFactory;
	headings: MarkdownHeading[];
	isEncrypted: boolean;
	lastModified: string;
	jsonLd: BlogPostingJsonLd;
	posterCoverUrl?: string;
	posterAvatarUrl?: string;
}
