import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const postsCollection = defineCollection({
	loader: glob({
		pattern: "**/*.md",
		base: "./src/content/posts",
	}),

	schema: z.object({
		/* Core */
		title: z.string(),
		published: z.coerce.date(),
		updated: z.coerce.date().optional(),

		/* Basic flags */
		draft: z.boolean().optional().default(false),
		pinned: z.boolean().optional().default(false),
		priority: z.number().optional(),

		/* Meta */
		description: z.string().optional().default(""),
		image: z.string().optional().default(""),
		author: z.string().optional().default(""),
		lang: z.string().optional().default(""),

		/* Classification */
		tags: z.array(z.string()).optional().default([]),
		category: z.string().optional().default(""),

		/* Interaction */
		comment: z.boolean().optional().default(true),

		/* Source & License */
		sourceLink: z.string().optional().default(""),
		licenseName: z.string().optional().default(""),
		licenseUrl: z.string().optional().default(""),

		/* Encryption */
		encrypted: z.boolean().optional().default(false),
		password: z.string().optional().default(""),

		/* Routing */
		alias: z.string().optional(),

		/* 推荐权重 */
		recommendScore: z.number().optional().default(0),

		/* =========================
       Deprecated fields
       为兼容旧版本保留
       不再使用
    ========================= */

		prevTitle: z.string().optional(),
		prevSlug: z.string().optional(),
		nextTitle: z.string().optional(),
		nextSlug: z.string().optional(),
	}),
});

/* =========================
   Spec Collection
========================= */

const specCollection = defineCollection({
	loader: glob({
		pattern: "**/*.md",
		base: "./src/content/spec",
	}),
	schema: z.object({}),
});

const notificationVisibilitySchema = z.object({
	scope: z.enum(["all", "home", "content"]).default("all"),
	include: z.array(z.string()).optional(),
	exclude: z.array(z.string()).optional(),
});

const notificationsCollection = defineCollection({
	loader: glob({
		pattern: "**/*.md",
		base: "./src/content/notifications",
	}),
	schema: z.object({
		title: z.string(),
		summary: z.string().optional().default(""),
		status: z.enum(["info", "success", "warning", "danger"]),
		level: z
			.enum(["normal", "important", "urgent", "critical"])
			.default("normal"),
		icon: z.string().optional(),
		dismissible: z.boolean().optional().default(true),
		requiresAck: z.boolean().optional().default(false),
		published: z.coerce.date().optional(),
		expires: z.coerce.date().optional(),
		action: z
			.object({
				label: z.string(),
				href: z.string(),
				external: z.boolean().optional().default(false),
			})
			.optional(),
		visibility: notificationVisibilitySchema.optional(),
	}),
});

/* =========================
   Export
========================= */

export const collections = {
	posts: postsCollection,
	spec: specCollection,
	notifications: notificationsCollection,
};
