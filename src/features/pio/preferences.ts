export const PIO_MOUNT_STORAGE_KEY = "pio-module-mounted";
export const PIO_MOUNT_EVENT = "pio-mount-change";

export type PioMountChangeDetail = {
	mounted: boolean;
};

export function getPioMounted(defaultMounted = true) {
	if (typeof localStorage === "undefined") return defaultMounted;
	const stored = localStorage.getItem(PIO_MOUNT_STORAGE_KEY);
	return stored === null ? defaultMounted : stored === "1";
}

export function setPioMounted(mounted: boolean) {
	localStorage.setItem(PIO_MOUNT_STORAGE_KEY, mounted ? "1" : "0");
	window.dispatchEvent(
		new CustomEvent<PioMountChangeDetail>(PIO_MOUNT_EVENT, {
			detail: { mounted },
		}),
	);
}
