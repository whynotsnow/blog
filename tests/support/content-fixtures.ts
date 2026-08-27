export const E2E_CATEGORY = {
	name: "测试内容",
	slug: "test-content",
	path: "/category/test-content/",
	tagApiPath: "/api/categories/test-content.json/",
	markdownTagPath: "/category/test-content/?tag=markdown",
	missingTagPath: "/category/test-content/?tag=missing-tag",
	tagLinkPrefix: "/category/test-content/?tag=",
	tagApiGlob: "**/api/categories/test-content.json/",
	pathPattern: /\/category\/test-content\/$/,
} as const;

export const E2E_POSTS = {
	writing: {
		title: "测试文章写作与 Frontmatter",
		path: "/posts/fixture-markdown-writing/",
		pathPattern: /\/posts\/fixture-markdown-writing\/$/,
	},
	extended: {
		path: "/posts/fixture-markdown-extended/",
		pathPattern: /\/posts\/fixture-markdown-extended\/$/,
	},
	tocGuide: {
		path: "/posts/fixture-toc-guide/",
	},
	encrypted: {
		path: "/posts/fixture-encrypted-example/",
		legacyPath: "/posts/fixture-encrypted-source/",
		canonicalUrl:
			"https://blog.whynotsnow.com/posts/fixture-encrypted-example/",
	},
} as const;
