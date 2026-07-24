import type { Live2DCompanionConfig } from "../types/config";

export const live2dCompanionConfig: Live2DCompanionConfig = {
	enable: true, // 默认挂载看板娘
	models: ["/live2d-companion/models/NOIR/noir.model3.json"], // 默认模型路径
	avatar: "/live2d-companion/models/NOIR/avatar.png", // 收起与加载状态头像
	position: "left", // 模型位置
	width: 280, // 默认宽度
	height: 200, // 默认高度
	modelScale: 1.18, // 保持 canvas 尺寸不变，提高模型绘制密度
	mode: "draggable", // 默认为可拖拽模式
	hiddenOnMobile: true, // 默认在移动设备上隐藏
	hideAboutMenu: false, // 是否隐藏内置 About 菜单按钮
	dialog: {
		welcome: "欢迎来到 Snow 的博客！希望你能找到有用的内容～", // 欢迎词
		touch: [
			"咦？你在做什么？",
			"不要乱点我啦！",
			"喂喂，这样有点奇怪哦！",
			"再点我就要生气啦！",
		], // 触摸提示
		home: "点击这里可以回到博客首页～", // 首页提示
		skin: ["想看看我的新装扮吗？", "新衣服是不是很好看～"], // 换装提示
		close: "那我先收起来啦，下次再见～", // 收起提示
		link: "https://github.com/whynotsnow/blog", // 关于链接
	},
};
