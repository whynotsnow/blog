import type {
	DARK_MODE,
	LIGHT_MODE,
	WALL_BANNER,
	WALL_FULL_BANNER,
	WALL_FULL,
	WALL_NONE,
} from "../constants/constants";

export type SiteConfig = {
	title: string;
	subtitle: string;
	siteURL: string; // 站点URL，以斜杠结尾，例如：https://mizuki.mysqil.com/
	keywords?: string[]; // 站点关键词，用于生成 <meta name="keywords">
	siteStartDate?: string; // 站点开始日期，格式：YYYY-MM-DD，用于计算运行天数

	timeZone:
		| -12
		| -11
		| -10
		| -9
		| -8
		| -7
		| -6
		| -5
		| -4
		| -3
		| -2
		| -1
		| 0
		| 1
		| 2
		| 3
		| 4
		| 5
		| 6
		| 7
		| 8
		| 9
		| 10
		| 11
		| 12;

	lang:
		| "en"
		| "zh_CN"
		| "zh_TW"
		| "ja"
		| "ko"
		| "es"
		| "th"
		| "vi"
		| "tr"
		| "id";

	themeColor: {
		hue: number;
		fixed: boolean;
	};

	// 特色页面开关配置
	featurePages: {
		anime: boolean; // 番剧页面开关
		diary: boolean; // 日记页面开关
		friends: boolean; // 友链页面开关
		projects: boolean; // 项目页面开关
		skills: boolean; // 技能页面开关
		timeline: boolean; // 时间线页面开关
		albums: boolean; // 相册页面开关
		devices: boolean; // 设备页面开关
	};

	// 文章列表布局配置
	postListLayout: {
		defaultMode: "list" | "grid"; // 默认布局模式：list=列表模式，grid=网格模式
		enable?: boolean; // 是否启用布局切换功能
		allowSwitch: boolean; // 是否允许用户切换布局
		categoryBar?: {
			enable: boolean; // 是否在文章列表页显示分类导航条
		};
	};

	// 顶栏标题配置
	navbarTitle?: {
		mode?: "text-icon" | "logo"; // 显示模式："text-icon" 显示图标+文本，"logo" 仅显示Logo
		text: string; // 顶栏标题文本
		icon?: string; // 顶栏标题图标路径
		logo?: string; // 网站Logo图片路径
	};

	// 页面自动缩放配置
	pageScaling?: {
		enable: boolean; // 是否开启自动缩放
		targetWidth?: number; // 目标宽度，低于此宽度时开始缩放
	};

	// 添加bangumi配置
	bangumi?: {
		userId?: string; // Bangumi用户ID
		fetchOnDev?: boolean;
	};

	// 添加bilibili配置
	bilibili?: {
		vmid?: string; // Bilibili用户ID (vmid)
		fetchOnDev?: boolean; // 是否在开发环境下获取 Bilibili 数据
		coverMirror?: string; // 封面图片镜像源（可选，默认为空字符串）
		useWebp?: boolean; // 是否使用WebP格式（默认 true）
	};

	// 添加番剧页面配置
	anime?: {
		mode?: "bangumi" | "local" | "bilibili"; // 番剧页面模式
	};

	// 标签样式配置
	tagStyle?: {
		useNewStyle?: boolean; // 是否使用新样式（悬停高亮样式）还是旧样式（外框常亮样式）
	};

	// 壁纸模式配置
	wallpaperMode: {
		defaultMode: "banner" | "full-banner" | "full-wall" | "none"; // 默认壁纸模式：banner=横幅模式，full-banner=全屏横幅，full-wall=全屏壁纸，none=隐藏壁纸
		showModeSwitchOnMobile?: "off" | "mobile" | "desktop" | "both"; // 整体布局方案切换按钮显示设置：off=隐藏，mobile=仅移动端，desktop=仅桌面端，both=全部显示
	};

	banner: {
		src:
			| string
			| string[]
			| {
					desktop?: string | string[];
					mobile?: string | string[];
			  }; // 支持单个图片、图片数组或分别设置桌面端和移动端图片
		position?: "top" | "center" | "bottom";
		carousel?: {
			enable: boolean; // 是否启用轮播
			interval: number; // 轮播间隔时间（秒）
			switchable?: boolean; // 是否允许在设置面板中切换
		};
		waves?: {
			enable: boolean; // 是否启用水波纹效果
			performanceMode?: boolean; // 性能模式：减少动画复杂度
			mobileDisable?: boolean; // 移动端禁用
			switchable?: boolean; // 是否允许在设置面板中切换
		};
		imageApi?: {
			enable: boolean; // 是否启用图片API
			url: string; // API地址，返回每行一个图片链接的文本
		};
		homeText?: {
			enable: boolean; // 是否在首页显示自定义文字
			title?: string; // 主标题
			subtitle?: string | string[]; // 副标题，支持单个字符串或字符串数组
			typewriter?: {
				enable: boolean; // 是否启用打字机效果
				speed: number; // 打字速度（毫秒）
				deleteSpeed: number; // 删除速度（毫秒）
				pauseTime: number; // 完整显示后的暂停时间（毫秒）
			};
			switchable?: boolean; // 是否允许在设置面板中切换
		};
		credit: {
			enable: boolean;
			text: string;
			url?: string;
		};
		navbar?: {
			transparentMode?: "semi" | "full" | "semifull"; // 导航栏透明模式
		};
	};
	toc: {
		enable: boolean;
		mode: "float" | "sidebar"; // 目录显示模式："float" 悬浮按钮模式，"sidebar" 侧边栏模式
		depth: 1 | 2 | 3;
		useJapaneseBadge?: boolean; // 使用日语假名标记（あいうえお...）代替数字
	};
	showCoverInContent: boolean; // 控制文章封面在文章内容页显示的开关
	generateOgImages: boolean;
	favicon: Favicon[];
	showLastModified: boolean; // 控制“上次编辑”卡片显示的开关
};

export type Favicon = {
	src: string;
	theme?: "light" | "dark";
	sizes?: string;
};

export enum LinkPreset {
	Home = 0,
	Archive = 1,
	About = 2,
	Friends = 3,
	Anime = 4,
	Diary = 5,
	Albums = 6,
	Projects = 7,
	Skills = 8,
	Timeline = 9,
}

export type NavBarLink = {
	name: string;
	url: string;
	external?: boolean;
	icon?: string; // 菜单项图标
	children?: (NavBarLink | LinkPreset)[]; // 支持子菜单，可以是NavBarLink或LinkPreset
};

export type NavBarConfig = {
	links: (NavBarLink | LinkPreset)[];
};

export type ProfileConfig = {
	avatar?: string;
	name: string;
	bio?: string;
	links: {
		name: string;
		url: string;
		icon: string;
	}[];
	typewriter?: {
		enable: boolean; // 是否启用打字机效果
		speed?: number; // 打字速度（毫秒）
	};
};

export type LicenseConfig = {
	enable: boolean;
	name: string;
	url: string;
};

// 评论配置

export type CommentConfig = {
	enable: boolean; // 是否启用评论功能
	twikoo?: TwikooConfig;
};

type TwikooConfig = {
	envId: string;
	region?: string;
	lang?: string;
};

export type LIGHT_DARK_MODE = typeof LIGHT_MODE | typeof DARK_MODE;

export type WALL_MODE =
	| typeof WALL_BANNER
	| typeof WALL_FULL_BANNER
	| typeof WALL_FULL
	| typeof WALL_NONE;

export type BlogPostData = {
	body: string;
	title: string;
	published: Date;
	description: string;
	tags: string[];
	draft?: boolean;
	image?: string;
	category?: string;
	pinned?: boolean;
	prevTitle?: string;
	prevSlug?: string;
	nextTitle?: string;
	nextSlug?: string;
};

export type ExpressiveCodeConfig = {
	theme: string;
	hideDuringThemeTransition?: boolean; // 是否在主题切换时隐藏代码块
};

export type MusicPlayerConfig = {
	enable: boolean; // 是否默认挂载音乐播放器
	mode: "meting" | "local"; // 音乐播放器模式
	meting_api: string; // Meting API 地址
	id: string; // 歌单ID
	server: string; // 音乐源服务器
	type: string; // 音乐类型
};

export type FooterConfig = {
	enable: boolean; // 是否启用Footer HTML注入功能
	customHtml?: string; // 自定义HTML内容，用于添加备案号等信息
};

// 组件配置类型定义
export type SakuraConfig = {
	enable: boolean; // 是否启用樱花特效
	switchable?: boolean; // 是否允许在设置面板中切换
	sakuraNum: number; // 樱花数量，默认21
	limitTimes: number; // 樱花越界限制次数，-1为无限循环
	size: {
		min: number; // 樱花最小尺寸倍数
		max: number; // 樱花最大尺寸倍数
	};
	opacity: {
		min: number; // 樱花最小不透明度
		max: number; // 樱花最大不透明度
	};
	speed: {
		horizontal: {
			min: number; // 水平移动速度最小值
			max: number; // 水平移动速度最大值
		};
		vertical: {
			min: number; // 垂直移动速度最小值
			max: number; // 垂直移动速度最大值
		};
		rotation: number; // 旋转速度
		fadeSpeed: number; // 消失速度
	};
	zIndex: number; // 层级，确保樱花在合适的层级显示
};

export type WallConfig = {
	enable?: boolean; // 是否启用全屏壁纸资源
	src:
		| string
		| string[]
		| {
				desktop?: string | string[];
				mobile?: string | string[];
		  }; // 支持单个图片、图片数组或分别设置桌面端和移动端图片
	position?: "top" | "center" | "bottom"; // 壁纸位置，等同于 object-position
	carousel?: {
		enable: boolean; // 是否启用轮播
		interval: number; // 轮播间隔时间（秒）
	};
	zIndex?: number; // 层级，确保壁纸在合适的层级显示
	opacity?: number; // 壁纸透明度，0-1之间
	blur?: number; // 背景模糊程度，单位px
	switchable?: boolean; // 是否允许在设置面板中切换壁纸模式
	effects?: {
		opacity?: number; // 全屏壁纸不透明度
		blur?: number; // 全屏壁纸模糊半径
		cardOpacity?: number; // 全屏壁纸模式下卡片不透明度
		switchable?:
			| boolean
			| {
					opacity?: boolean;
					blur?: boolean;
					cardOpacity?: boolean;
			  };
	};
};

/**
 * Live2D 看板娘配置
 */
export type Live2DExpressionMenuConfig = {
	panelIcon?: string; // 完整表情面板按钮的本地图标名称
	panelLabel?: string; // 完整表情面板按钮文案
	enablePanel?: boolean; // 是否启用完整表情面板入口
	maxActions?: number; // iframe action 区最多展示数量，当前支持上限为 5
	maxPanelItems?: number; // 完整表情面板最多展示数量，当前支持上限为 24
	labels?: Record<string, string>; // 完整表情面板中的中文名称
	shortcuts?: Array<{
		name: string; // Live2D expression 名称
		label: string; // 表情按钮文案
		icon?: string; // 本地图标名称
	}>;
};

export type Live2DIdlePlaybackConfig = {
	enable?: boolean; // 是否启用空闲随机播放
	interval?: number; // 每轮随机播放间隔（ms）
	includeActions?: boolean; // 是否把 action shortcut 纳入随机池
	includePanel?: boolean; // 是否把完整表情面板中的表情纳入随机池
	expressions?: string[]; // 显式指定随机播放的 expression 名称；配置后优先使用
};

export type Live2DCompanionModelConfig = {
	path: string; // 模型文件路径
	label?: string; // 模型切换菜单中的名称
	avatar?: string; // 收起与加载状态头像
	scale?: number; // 覆盖全局模型绘制缩放
	offset?: [number, number]; // 覆盖全局模型绘制偏移 [x, y]
	defaultParameters?: Record<string, number>; // 当前模型显示前应用的默认 Live2D 参数
	expressionMenu?: Live2DExpressionMenuConfig; // 当前模型的 action 与表情轮盘配置
	idlePlayback?: Live2DIdlePlaybackConfig; // 当前模型空闲时随机播放的表情或动作配置
};

export type Live2DCompanionConfig = {
	enable: boolean; // 是否默认挂载看板娘
	models?: Array<string | Live2DCompanionModelConfig>; // 模型路径或模型配置数组
	avatar?: string; // 收起与加载状态头像
	position?: "left" | "right"; // 看板娘位置
	width?: number; // 看板娘宽度
	height?: number; // 看板娘高度
	modelScale?: number; // 模型在 canvas 内的绘制缩放
	modelOffset?: [number, number]; // 模型在 canvas 内的绘制偏移 [x, y]
	defaultParameters?: Record<string, number>; // 模型显示前应用的默认 Live2D 参数
	hiddenOnMobile?: boolean; // 是否在移动设备上隐藏
	hideAboutMenu?: boolean; // 是否隐藏 widget 内置 About/休眠/Switch 菜单按钮
	modelSwitch?: {
		icon?: string; // 本地图标名称
		label?: string; // 模型切换按钮文案
	};
	expressionMenu?: Live2DExpressionMenuConfig;
	idlePlayback?: Live2DIdlePlaybackConfig;
	ui?: {
		themeMode?: "site" | "custom"; // UI 主题来源
		messageOffset?: {
			top?: number; // 消息气泡距离 iframe 顶部的偏移
		};
		collapseIcon?: string; // 本地图标名称
		collapseLabel?: string; // 收起按钮无障碍文案
		dragIndicatorIcon?: string; // 拖拽准备状态提示图标的本地图标名称
		hideWidgetStatusPanel?: boolean; // 是否隐藏 widget 自带加载/休息侧栏
		dragHoverDelay?: number; // 鼠标悬停多久后进入拖拽准备状态（ms）
	};
	dialog?: {
		welcome?: string | string[]; // 欢迎词
		touch?: string | string[]; // 触摸提示
		close?: string; // 关闭提示
	};
	tips?: {
		welcomeMessage?: string[]; // 欢迎语
		messages?: string[]; // 循环提示内容
		duration?: number; // 每条 tips 展示时长（ms）
		interval?: number; // tips 循环间隔（ms）
	};
};

/**
 * 分享组件配置
 */
export type ShareConfig = {
	enable: boolean; // 是否启用分享功能
};
