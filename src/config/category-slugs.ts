export type CategoryDefinition = {
	name: string;
	slug: string;
	aliases?: readonly string[];
};

export const CATEGORY_SLUGS = {
	technology: "tech",
	blogTechnology: "blog-tech",
	testContent: "test-content",
} as const;

export const CATEGORY_DEFINITIONS: readonly CategoryDefinition[] = [
	{
		name: "技术",
		slug: CATEGORY_SLUGS.technology,
		aliases: ["Technology"],
	},
	{ name: "博客技术", slug: CATEGORY_SLUGS.blogTechnology },
	{ name: "测试内容", slug: CATEGORY_SLUGS.testContent },
	{ name: "前端", slug: "frontend" },
	{ name: "随笔", slug: "notes" },
	{ name: "生活", slug: "life" },
	{ name: "学习", slug: "learn" },
	{ name: "工作", slug: "work" },
	{ name: "教程", slug: "tutorials" },
	{ name: "Guides", slug: "guides" },
] as const;
