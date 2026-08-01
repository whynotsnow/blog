export type Live2DCompanionModelConfig = {
	path: string;
	scale?: number;
	offset?: [number, number];
	tips?: Record<string, unknown>;
};

export type Live2DExpressionMenuConfig = {
	panelIcon?: string;
	panelLabel?: string;
	enablePanel?: boolean;
	maxActions?: number;
	maxPanelItems?: number;
	labels?: Record<string, string>;
	shortcuts?: Array<{
		name: string;
		label: string;
		icon?: string;
	}>;
};

export type Live2DIdlePlaybackConfig = {
	enable?: boolean;
	interval?: number;
	includeActions?: boolean;
	includePanel?: boolean;
	expressions?: string[];
};

export type Live2DWidgetConfig = {
	model: Live2DCompanionModelConfig | Live2DCompanionModelConfig[];
	position: "bottom-left" | "bottom-right";
	size: {
		width: number;
		height: number;
	};
	theme?: Record<string, string>;
	transitionDuration: number;
	transitionType: "slide";
	_models?: Live2DCompanionModelConfig[];
	_modelProfiles?: Array<{
		path: string;
		label?: string;
		avatar?: string;
		defaultParameters?: Record<string, number>;
		expressionMenu?: Live2DExpressionMenuConfig;
		idlePlayback?: Live2DIdlePlaybackConfig;
	}>;
	_modelSwitch?: {
		icon?: string;
		label?: string;
	};
	_expressionMenu?: Live2DExpressionMenuConfig;
	_idlePlayback?: Live2DIdlePlaybackConfig;
	ui?: {
		themeMode?: "site" | "custom";
		messageOffset?: {
			top?: number;
		};
		collapseIcon?: string;
		collapseLabel?: string;
		dragIndicatorIcon?: string;
		hideWidgetStatusPanel?: boolean;
		dragHoverDelay?: number;
	};
	_hideAbout: boolean;
	menus?: {
		items: [];
	};
};

export type Live2DCompanionStoredPosition = {
	left: number;
	top: number;
};

export type Live2DCompanionCollapsedSnapEdge = "top" | "bottom";

export type Live2DCompanionAnchor = {
	edge: "left" | "right";
	centerY: number;
};

export type Live2DCompanionDragPointer = {
	x: number;
	y: number;
	pointerId?: number;
};
