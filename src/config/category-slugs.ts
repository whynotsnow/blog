export type CategoryDefinition = {
	name: string;
	slug: string;
	aliases?: readonly string[];
};

export const CATEGORY_DEFINITIONS: readonly CategoryDefinition[] = [
	{ name: "技术", slug: "tech", aliases: ["Technology"] },
	{ name: "前端", slug: "frontend" },
	{ name: "随笔", slug: "notes" },
	{ name: "生活", slug: "life" },
	{ name: "学习", slug: "learn" },
	{ name: "工作", slug: "work" },
	{ name: "教程", slug: "tutorials" },
	{ name: "Guides", slug: "guides" },
] as const;
