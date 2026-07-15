export const PIO_VISIBILITY_STORAGE_KEY = "posterGirl";
export const PIO_VISIBILITY_EVENT = "pio-visibility-change";

export type PioVisibilityChangeDetail = {
	visible: boolean;
	source: "preference" | "pio";
};

export function getPioVisible() {
	if (typeof localStorage === "undefined") return true;
	return localStorage.getItem(PIO_VISIBILITY_STORAGE_KEY) !== "0";
}

export function setPioVisible(visible: boolean) {
	localStorage.setItem(PIO_VISIBILITY_STORAGE_KEY, visible ? "1" : "0");
	window.dispatchEvent(
		new CustomEvent<PioVisibilityChangeDetail>(PIO_VISIBILITY_EVENT, {
			detail: { visible, source: "preference" },
		}),
	);
}
