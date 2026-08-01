export const LIVE2D_COMPANION_MOUNT_STORAGE_KEY = "live2d-companion-mounted";
export const LIVE2D_COMPANION_COLLAPSED_STORAGE_KEY =
	"live2d-companion-collapsed";
export const LIVE2D_COMPANION_MOUNT_EVENT = "live2d-companion-mount-change";

export type Live2DCompanionMountChangeDetail = {
	mounted: boolean;
};

function readBooleanStorage(key: string): boolean | undefined {
	const stored = localStorage.getItem(key);
	return stored === null ? undefined : stored === "1";
}

export function getLive2DCompanionMounted(defaultMounted = true): boolean {
	if (typeof localStorage === "undefined") return defaultMounted;
	const stored = readBooleanStorage(LIVE2D_COMPANION_MOUNT_STORAGE_KEY);
	return stored ?? defaultMounted;
}

export function setLive2DCompanionMounted(mounted: boolean): void {
	localStorage.setItem(
		LIVE2D_COMPANION_MOUNT_STORAGE_KEY,
		mounted ? "1" : "0",
	);
	window.dispatchEvent(
		new CustomEvent<Live2DCompanionMountChangeDetail>(
			LIVE2D_COMPANION_MOUNT_EVENT,
			{
				detail: { mounted },
			},
		),
	);
}

export function getLive2DCompanionCollapsed(defaultCollapsed = false): boolean {
	if (typeof localStorage === "undefined") return defaultCollapsed;
	const stored = readBooleanStorage(LIVE2D_COMPANION_COLLAPSED_STORAGE_KEY);
	return stored ?? defaultCollapsed;
}

export function setLive2DCompanionCollapsed(collapsed: boolean): void {
	localStorage.setItem(
		LIVE2D_COMPANION_COLLAPSED_STORAGE_KEY,
		collapsed ? "1" : "0",
	);
}
