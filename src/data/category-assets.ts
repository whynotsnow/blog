export type CategoryImageAsset = {
	src: string;
	alt?: string;
	position?: string;
};

export type CategoryAsset = {
	description?: string;
	image?: CategoryImageAsset;
};

export const categoryAssets: Record<string, CategoryAsset> = {
	examples: {
		description: "用于展示站点能力、写作格式与交互组件的示例内容。",
		image: {
			src: "/assets/desktop-banner/5.webp",
			alt: "Examples category cover",
			position: "center",
		},
	},
	tech: {
		description: "记录前端工程、框架实践、构建工具与技术问题处理。",
		image: {
			src: "/assets/desktop-banner/1.webp",
			alt: "技术 category cover",
			position: "center",
		},
	},
	"blog-tech": {
		description:
			"记录当前博客系统的功能说明、写作规范、内容维护和发布输出。",
		image: {
			src: "/assets/desktop-banner/6.webp",
			alt: "博客技术 category cover",
			position: "center",
		},
	},
	"test-content": {
		description:
			"用于验证博客内容管线、分类、标签、分页和文章详情的测试内容。",
		image: {
			src: "/assets/desktop-banner/5.webp",
			alt: "测试内容 category cover",
			position: "center",
		},
	},
	guides: {
		description: "整理可复用的操作步骤、配置方法和实践指南。",
		image: {
			src: "/assets/desktop-banner/2.webp",
			alt: "guides category cover",
			position: "center",
		},
	},
	learn: {
		description: "沉淀学习笔记、知识索引和阶段性理解。",
		image: {
			src: "/assets/desktop-banner/3.webp",
			alt: "学习 category cover",
			position: "center",
		},
	},
	work: {
		description: "归档工作流、项目经验与问题复盘。",
		image: {
			src: "/assets/desktop-banner/4.webp",
			alt: "工作 category cover",
			position: "center",
		},
	},
};
