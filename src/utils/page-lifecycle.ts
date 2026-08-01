type SwupVisit = {
	to?: {
		url?: string;
		hash?: string;
	};
	history?: {
		popstate?: boolean;
	};
	scroll?: {
		reset: boolean;
		target?: string | false;
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
let boundSwup: Window["swup"] | undefined;
let swupEnableListenerBound = false;
let firstLoadDispatched = false;

function emit(
	event: PageLifecycleEvent,
	payload: PageLifecyclePayload = {},
): void {
	callbacks.get(event)?.forEach((callback) => callback(payload));
}

function runFirstLoad(): void {
	if (firstLoadDispatched) return;
	firstLoadDispatched = true;
	emit("first-load");
}

function onReady(callback: () => void): void {
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", callback, { once: true });
	} else {
		callback();
	}
}

function bindSwup(): boolean {
	const swup = window.swup;
	if (!swup?.hooks) return false;
	if (boundSwup === swup) return true;

	boundSwup = swup;
	swup.hooks.on("link:click", () => emit("link-click"));
	swup.hooks.on("animation:out:start", () => emit("animation-out-start"));
	swup.hooks.on("content:replace", () => emit("content-replace"));
	swup.hooks.on("page:view", () => emit("page-view"));
	swup.hooks.on("visit:start", (visit: unknown) =>
		emit("visit-start", { visit: toSwupVisit(visit) }),
	);
	swup.hooks.on("visit:end", (visit: unknown) =>
		emit("visit-end", { visit: toSwupVisit(visit) }),
	);

	return true;
}

function toSwupVisit(visit: unknown): SwupVisit | undefined {
	if (!visit || typeof visit !== "object") return undefined;
	return visit as SwupVisit;
}

function ensureLifecycle(): void {
	onReady(runFirstLoad);

	bindSwup();
	if (swupEnableListenerBound) return;
	swupEnableListenerBound = true;
	document.addEventListener("swup:enable", () => {
		queueMicrotask(bindSwup);
		window.setTimeout(bindSwup, 0);
	});
}

export function onPageLifecycle(
	event: PageLifecycleEvent,
	callback: PageLifecycleCallback,
): () => boolean {
	if (!callbacks.has(event)) {
		callbacks.set(event, new Set());
	}

	callbacks.get(event)?.add(callback);
	ensureLifecycle();

	if (event === "first-load" && firstLoadDispatched) {
		callback({});
	}

	return () => callbacks.get(event)?.delete(callback) ?? false;
}

if (typeof window !== "undefined") {
	window.onPageLifecycle = onPageLifecycle;
}
