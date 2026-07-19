import type {
	PostIndexEntry,
	PostNavigationLink,
	RawPost,
} from "../core/types";
import { AstroComponentFactory } from "astro/runtime/server/index.js";
import { MarkdownHeading } from "astro";

export type Person = {
	"@type": "Person";
	name: string;
	url?: string;
	image?: string;
	sameAs?: string[];
};

export type ImageObject = {
	"@type": "ImageObject";
	url: string;
	width?: number;
	height?: number;
	caption?: string;
};

export type BlogPostingJsonLd = {
	"@context": "https://schema.org";
	"@type": "BlogPosting";
	headline: string;
	description: string;
	keywords?: string | string[];
	author: Person | Person[];
	datePublished: string;
	dateModified?: string;
	inLanguage: string;
	image?: string | ImageObject;
	url?: string;
	mainEntityOfPage?: {
		"@type": "WebPage";
		"@id": string;
	};
	publisher?:
		| Person
		| {
				"@type": "Organization";
				name: string;
				logo?: ImageObject;
		  };
	articleSection?: string | string[];
	wordCount?: number;
	timeRequired?: string;
	thumbnailUrl?: string;
};

export type PostDetailEntry = RawPost & {
	meta: {
		postId: number;
		route: PostIndexEntry["route"];
		words: number;
		minutes: number;
		excerpt: string;
		prev?: PostNavigationLink;
		next?: PostNavigationLink;
	};
};

export type PostDetailPageProps = {
	entry: PostDetailEntry;
	canonicalUrl: string;
	canonicalOgSlug: string;
	Content: AstroComponentFactory;
	headings: MarkdownHeading[];
	isEncrypted: boolean;
	lastModified: string;
	jsonLd: BlogPostingJsonLd;
	posterCoverUrl?: string;
	posterAvatarUrl?: string;
};
