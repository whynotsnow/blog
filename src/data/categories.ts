export interface CategoryTag {
	slug: string;
	name: string;
}

export interface Category {
	slug: string;
	name: string;
	tags?: CategoryTag[];
}

export const categories: Category[] = [
	{
		slug: "tech",
		name: "技术",
		tags: [
			{ slug: "vue", name: "Vue" },
			{ slug: "react", name: "React" },
			{ slug: "前端", name: "前端" },
		],
	},
	{
		slug: "frontend",
		name: "前端",
		tags: [
			{ slug: "css", name: "CSS" },
			{ slug: "工程化", name: "工程化" },
		],
	},
	{
		slug: "life",
		name: "生活",
	},
	{
		slug: "examples",
		name: "Examples",
	},
	{
		slug: "Guides",
		name: "guides",
	},

	{
		slug: "technology",
		name: "Technology",
	},
	{
		slug: "learn",
		name: "学习",
	},
	{
		slug: "work",
		name: "工作",
	},
	{
		slug: "tutorials",
		name: "教程",
	},
	{
		slug: "notes",
		name: "随笔",
	},
];
