type SwupVisit = {
	to?: {
		url?: string;
	};
};

type PageLifecyclePayload = {
	visit?: SwupVisit;
};

export type PageLifecycleEvent =
	| "first-load"
	| "link-click"
	| "animation-out-start"
	| "content-replace"
	| "page-view"
	| "visit-start"
	| "visit-end";

type PageLifecycleCallback = (payload: PageLifecyclePayload) => void;

const callbacks = new Map<PageLifecycleEvent, Set<PageLifecycleCallback>>();
let swupBound = false;
let firstLoadDispatched = false;

function emit(event: PageLifecycleEvent, payload: PageLifecyclePayload = {}) {
	callbacks.get(event)?.forEach((callback) => callback(payload));
}

function runFirstLoad() {
	if (firstLoadDispatched) return;
	firstLoadDispatched = true;
	emit("first-load");
}

function onReady(callback: () => void) {
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", callback, { once: true });
	} else {
		callback();
	}
}

function bindSwup() {
	if (swupBound || !window.swup?.hooks) return Boolean(window.swup?.hooks);

	swupBound = true;
	window.swup.hooks.on("link:click", () => emit("link-click"));
	window.swup.hooks.on("animation:out:start", () =>
		emit("animation-out-start"),
	);
	window.swup.hooks.on("content:replace", () => emit("content-replace"));
	window.swup.hooks.on("page:view", () => emit("page-view"));
	window.swup.hooks.on("visit:start", (visit: unknown) =>
		emit("visit-start", { visit: toSwupVisit(visit) }),
	);
	window.swup.hooks.on("visit:end", (visit: unknown) =>
		emit("visit-end", { visit: toSwupVisit(visit) }),
	);

	return true;
}

function toSwupVisit(visit: unknown): SwupVisit | undefined {
	if (!visit || typeof visit !== "object") return undefined;
	return visit as SwupVisit;
}

function ensureLifecycle() {
	onReady(runFirstLoad);

	if (bindSwup()) return;

	const onSwupEnable = () => {
		if (bindSwup()) {
			document.removeEventListener("swup:enable", onSwupEnable);
		}
	};

	document.addEventListener("swup:enable", onSwupEnable);
}

export function onPageLifecycle(
	event: PageLifecycleEvent,
	callback: PageLifecycleCallback,
) {
	if (!callbacks.has(event)) {
		callbacks.set(event, new Set());
	}

	callbacks.get(event)?.add(callback);
	ensureLifecycle();

	if (event === "first-load" && firstLoadDispatched) {
		callback({});
	}

	return () => callbacks.get(event)?.delete(callback);
}

if (typeof window !== "undefined") {
	window.onPageLifecycle = onPageLifecycle;
}
