import type { EffectsConfig, SakuraConfig } from "../types/config";

export const effectsConfig: EffectsConfig = {
	waves: {
		enable: true, // 是否启用水波纹效果（注意：此功能性能开销较大）
		performanceMode: false, // 性能模式：减少动画复杂度(性能提升40%)
		mobileDisable: false, // 移动端禁用
		switchable: true, // 是否允许在设置面板中切换
	},
	sakura: {
		enable: false, // 默认关闭樱花特效
		switchable: true, // 是否允许在设置面板中切换
		sakuraNum: 21, // 樱花数量
		limitTimes: -1, // 樱花越界限制次数，-1为无限循环
		size: {
			min: 0.5, // 樱花最小尺寸倍数
			max: 1.1, // 樱花最大尺寸倍数
		},
		opacity: {
			min: 0.3, // 樱花最小不透明度
			max: 0.9, // 樱花最大不透明度
		},
		speed: {
			horizontal: {
				min: -1.7, // 水平移动速度最小值
				max: -1.2, // 水平移动速度最大值
			},
			vertical: {
				min: 1.5, // 垂直移动速度最小值
				max: 2.2, // 垂直移动速度最大值
			},
			rotation: 0.03, // 旋转速度
			fadeSpeed: 0.03, // 消失速度，不应大于最小不透明度
		},
		zIndex: 100, // 层级，确保樱花在合适的层级显示
	},
};

export const sakuraConfig: SakuraConfig = effectsConfig.sakura;
