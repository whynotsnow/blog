import type { PioConfig } from "../types/config";

export const pioConfig: PioConfig = {
	enable: true, // 启用看板娘
	models: ["/pio/models/pio/model.json"], // 默认模型路径
	position: "left", // 模型位置
	width: 280, // 默认宽度
	height: 250, // 默认高度
	mode: "draggable", // 默认为可拖拽模式
	hiddenOnMobile: true, // 默认在移动设备上隐藏
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
		close: "那我先休息一下啦，下次再见～", // 关闭提示
		link: "https://github.com/whynotsnow/blog", // 关于链接
	},
};
