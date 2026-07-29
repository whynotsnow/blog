import type { WallConfig } from "../types/config";
import { bannerImageSources } from "./banner-images";

export const wallConfig: WallConfig = {
	enable: true,
	src: bannerImageSources, // 使用本地横幅图片
	position: "center", // 壁纸位置，等同于 object-position
	carousel: {
		enable: true, // 启用轮播
		interval: 5, // 轮播间隔时间（秒）
	},
	zIndex: -1, // 层级，确保壁纸在背景层
	opacity: 0.8, // 壁纸透明度
	blur: 1, // 背景模糊程度
	switchable: true,
	effects: {
		opacity: 0.8,
		blur: 1.5,
		cardOpacity: 0.8,
		switchable: {
			opacity: true,
			blur: true,
			cardOpacity: true,
		},
	},
};
