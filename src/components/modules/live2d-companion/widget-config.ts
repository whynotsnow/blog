import { live2dCompanionConfig } from "@/config";
import type {
	Live2DCompanionModelConfig,
	Live2DExpressionMenuConfig,
	Live2DIdlePlaybackConfig,
	Live2DWidgetConfig,
} from "./types";

type Live2DModelEntry = {
	path: string;
	label?: string;
	avatar?: string;
	scale?: number;
	offset?: [number, number];
	defaultParameters?: Record<string, number>;
	expressionMenu?: Live2DExpressionMenuConfig;
	idlePlayback?: Live2DIdlePlaybackConfig;
};

export const defaultDragHoverDelay: number = 1500;
export const modelStorageKey: string = "live2d-companion-model-index";
export const defaultAvatarSrc: string =
	live2dCompanionConfig.avatar ?? "/live2d-companion/models/NOIR/avatar.png";

export function normalizeMessages(
	value?: string | string[],
): string[] | undefined {
	if (!value) return undefined;
	return Array.isArray(value) ? value : [value];
}

function buildTipsData(): Record<string, unknown> {
	const tipsData: Record<string, unknown> = {};
	if (live2dCompanionConfig.tips) {
		if (live2dCompanionConfig.tips.welcomeMessage) {
			tipsData.welcomeMessage = live2dCompanionConfig.tips.welcomeMessage;
		}
		if (live2dCompanionConfig.tips.messages) {
			tipsData.messages = live2dCompanionConfig.tips.messages;
		}
		if (live2dCompanionConfig.tips.duration)
			tipsData.duration = live2dCompanionConfig.tips.duration;
		if (live2dCompanionConfig.tips.interval)
			tipsData.interval = live2dCompanionConfig.tips.interval;
		return tipsData;
	}

	const welcome = normalizeMessages(live2dCompanionConfig.dialog?.welcome);
	const touch = normalizeMessages(live2dCompanionConfig.dialog?.touch);
	if (welcome) tipsData.welcomeMessage = welcome;
	if (touch) tipsData.messages = touch;
	return tipsData;
}

export function buildWidgetConfig(): Live2DWidgetConfig {
	const modelEntries: Live2DModelEntry[] = (
		live2dCompanionConfig.models ?? [
			"/live2d-companion/models/NOIR/noir.model3.json",
		]
	).map((model) => (typeof model === "string" ? { path: model } : model));
	const modelConfigs: Live2DCompanionModelConfig[] = modelEntries.map(
		(model) => ({
			path: model.path,
			...(typeof (model.scale ?? live2dCompanionConfig.modelScale) ===
				"number" && {
				scale: model.scale ?? live2dCompanionConfig.modelScale,
			}),
			...((model.offset ?? live2dCompanionConfig.modelOffset) && {
				offset: model.offset ?? live2dCompanionConfig.modelOffset,
			}),
		}),
	);
	const modelProfiles: NonNullable<Live2DWidgetConfig["_modelProfiles"]> =
		modelEntries.map((model) => ({
			path: model.path,
			...(model.label && { label: model.label }),
			...(model.avatar && { avatar: model.avatar }),
			...(model.expressionMenu && {
				expressionMenu: model.expressionMenu,
			}),
			...(model.idlePlayback && {
				idlePlayback: model.idlePlayback,
			}),
			...((model.defaultParameters ??
				live2dCompanionConfig.defaultParameters) && {
				defaultParameters:
					model.defaultParameters ??
					live2dCompanionConfig.defaultParameters,
			}),
		}));
	const tipsData = buildTipsData();
	const modelHeight =
		live2dCompanionConfig.height ?? live2dCompanionConfig.width ?? 280;

	if (Object.keys(tipsData).length > 0 && modelConfigs.length === 1) {
		modelConfigs[0].tips = tipsData;
	}

	const widgetConfig: Live2DWidgetConfig = {
		model: modelConfigs[0],
		_models: modelConfigs,
		_modelProfiles: modelProfiles,
		position:
			live2dCompanionConfig.position === "right"
				? "bottom-right"
				: "bottom-left",
		size: {
			width: live2dCompanionConfig.width ?? 280,
			height: modelHeight,
		},
		transitionDuration: 0,
		transitionType: "slide",
		ui: {
			themeMode: live2dCompanionConfig.ui?.themeMode ?? "site",
			messageOffset: {
				top: live2dCompanionConfig.ui?.messageOffset?.top ?? 32,
			},
			collapseIcon:
				live2dCompanionConfig.ui?.collapseIcon ??
				"material-symbols:visibility-off-rounded",
			collapseLabel:
				live2dCompanionConfig.ui?.collapseLabel ??
				live2dCompanionConfig.dialog?.close ??
				"Collapse companion",
			dragIndicatorIcon:
				live2dCompanionConfig.ui?.dragIndicatorIcon ??
				"local:move-four-way",
			hideWidgetStatusPanel:
				live2dCompanionConfig.ui?.hideWidgetStatusPanel ?? true,
			dragHoverDelay:
				live2dCompanionConfig.ui?.dragHoverDelay ??
				defaultDragHoverDelay,
		},
		_hideAbout: live2dCompanionConfig.hideAboutMenu ?? true,
		...(live2dCompanionConfig.modelSwitch && {
			_modelSwitch: live2dCompanionConfig.modelSwitch,
		}),
		...(live2dCompanionConfig.expressionMenu && {
			_expressionMenu: live2dCompanionConfig.expressionMenu,
		}),
		...(live2dCompanionConfig.idlePlayback && {
			_idlePlayback: live2dCompanionConfig.idlePlayback,
		}),
	};

	widgetConfig.menus = { items: [] };

	return widgetConfig;
}

export function getModelAvatarByStoredIndex(): string {
	const models = live2dCompanionConfig.models ?? [];
	const modelEntries: Live2DModelEntry[] = models.map((model) =>
		typeof model === "string" ? { path: model } : model,
	);
	if (modelEntries.length === 0) return defaultAvatarSrc;
	const rawIndex = Number(localStorage.getItem(modelStorageKey));
	const index = Number.isFinite(rawIndex)
		? Math.max(0, Math.min(modelEntries.length - 1, rawIndex))
		: 0;
	return modelEntries[index]?.avatar ?? defaultAvatarSrc;
}
