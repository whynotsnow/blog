import type { Live2DCompanionConfig } from "../types/config";

export const live2dCompanionConfig: Live2DCompanionConfig = {
	enable: true, // 默认挂载看板娘
	models: [
		{
			path: "/live2d-companion/models/14jiang/model.model3.json",
			label: "14酱",
			avatar: "/live2d-companion/models/14jiang/icon.png",
			defaultParameters: { CheekPuff2: 1 }, // 默认隐藏 14酱 水印，不注册为表情动作
			expressionMenu: {
				enablePanel: true,
				maxActions: 5,
				maxPanelItems: 24,
				shortcuts: [
					{
						name: "smile",
						label: "微笑",
						icon: "material-symbols:sentiment-satisfied-rounded",
					},
					{
						name: "heart-combo",
						label: "心动",
						icon: "material-symbols:mood-heart-rounded",
					},
					{
						name: "angry-combo",
						label: "生气",
						icon: "material-symbols:sentiment-frustrated-rounded",
					},
					{
						name: "dizzy-combo",
						label: "晕乎",
						icon: "material-symbols:face-shake-rounded",
					},
					{
						name: "blush",
						label: "脸红",
						icon: "material-symbols:sentiment-excited-rounded",
					},
				],
			},
			idlePlayback: {
				enable: true,
				interval: 12000,
				includeActions: true,
				includePanel: true,
			},
		},
		{
			path: "/live2d-companion/models/NOIR/noir.model3.json",
			label: "NOIR",
			avatar: "/live2d-companion/models/NOIR/avatar.png",
			expressionMenu: {
				enablePanel: false,
				maxActions: 5,
				shortcuts: [
					{
						name: "eyeclose",
						label: "闭眼",
						icon: "material-symbols:visibility-off-outline-rounded",
					},
					{
						name: "quanquan",
						label: "圈圈眼",
						icon: "material-symbols:cyclone-rounded",
					},
					{
						name: "tears",
						label: "眼泪",
						icon: "material-symbols:water-drop-rounded",
					},
					{
						name: "white",
						label: "变白",
						icon: "material-symbols:invert-colors-rounded",
					},
				],
			},
			idlePlayback: {
				enable: true,
				interval: 14000,
				includeActions: true,
				includePanel: false,
			},
		},
	], // 默认模型路径
	avatar: "/live2d-companion/models/14jiang/icon.png", // 收起与加载状态头像
	position: "left", // 模型位置
	width: 280, // 默认宽度
	height: 280, // 默认高度
	modelScale: 1, // 保持 canvas 尺寸不变，提高模型绘制密度
	hiddenOnMobile: false, // 中小屏仍展示看板娘，避免 Floating Tools 入口与组件消失
	hideAboutMenu: true, // 隐藏 widget 内置 About/休眠/Switch，统一使用本地菜单按钮
	modelSwitch: {
		icon: "material-symbols:swap-horiz-rounded",
		label: "切换模型",
	},
	expressionMenu: {
		panelIcon: "material-symbols:grid-view-rounded",
		panelLabel: "全部表情",
		enablePanel: true,
		maxActions: 5,
		maxPanelItems: 24,
		labels: {
			"x-mouth": "X 嘴",
			drool: "流口水",
			tongue: "吐舌",
			"default-expression": "默认表情",
			"dizzy-eyes": "晕眼",
			"crooked-mouth": "歪嘴",
			"v-sign": "比耶",
			sweat: "冒汗",
			"heart-eyes": "爱心眼",
			"angry-brows": "皱眉",
			"tear-1": "眼泪 1",
			"tear-2": "眼泪 2",
			smile: "微笑",
			"angry-combo": "生气",
			"heart-combo": "心动",
			"dizzy-combo": "晕乎",
			"v-dizzy-combo": "比耶晕眼",
			"combo-5": "组合 5",
			blush: "脸红",
			"tremble-mouth": "颤抖嘴",
			"dark-circles": "黑眼圈",
			"dark-face": "黑脸",
			eyeclose: "闭眼",
			quanquan: "圈圈眼",
			tears: "眼泪",
			white: "变白",
		},
	},
	idlePlayback: {
		enable: false,
		interval: 12000,
		includeActions: true,
		includePanel: false,
	},
	ui: {
		themeMode: "site", // 使用站点语义色同步 iframe 内 UI
		messageOffset: { top: 32 }, // 只调整壳层气泡，不依赖具体模型
		collapseIcon: "material-symbols:collapse-content-rounded", // 使用本地图标
		collapseLabel: "收起看板娘",
		hideWidgetStatusPanel: true,
	},
	dialog: {
		welcome: "欢迎来到 Snow 的博客！希望你能找到有用的内容～", // 欢迎词
		touch: [
			"咦？你在做什么？",
			"不要乱点我啦！",
			"喂喂，这样有点奇怪哦！",
			"再点我就要生气啦！",
		], // 触摸提示
		close: "那我先收起来啦，下次再见～", // 收起提示
	},
};
