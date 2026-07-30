import { onPageLifecycle } from "@/utils/page-lifecycle";

type TwikooConfig = {
	envId?: string;
	region?: string;
	lang?: string;
	el: string;
	path: string;
};

type TwikooApi = {
	init: (config: TwikooConfig) => Promise<unknown> | unknown;
};

type TwikooManager = {
	init: (reason?: string) => void;
};

declare global {
	interface Window {
		twikoo?: TwikooApi;
		__twikooCommentManager?: TwikooManager;
	}
}

const ROOT_SELECTOR = "[data-twikoo-root]";
const SCRIPT_SRC = "/assets/js/twikoo.all.min.js";
const INIT_KEY_ATTR = "twikooInitializedKey";

let scriptLoadPromise: Promise<void> | null = null;
let initVersion = 0;

function findRoot(): HTMLElement | null {
	return document.querySelector<HTMLElement>(ROOT_SELECTOR);
}

function readConfig(root: HTMLElement): TwikooConfig | null {
	const rawConfig = root.dataset.twikooConfig;
	if (!rawConfig) return null;

	try {
		return JSON.parse(rawConfig) as TwikooConfig;
	} catch (error) {
		console.error("[Twikoo] Failed to parse comment config.", error);
		return null;
	}
}

function buildInitKey(config: TwikooConfig) {
	return [
		config.envId ?? "",
		config.region ?? "",
		config.lang ?? "",
		config.path,
	].join("|");
}

function ensureTwikooScript() {
	if (window.twikoo) return Promise.resolve();
	if (scriptLoadPromise) return scriptLoadPromise;

	const existingScript = document.querySelector<HTMLScriptElement>(
		`script[src="${SCRIPT_SRC}"]`,
	);

	scriptLoadPromise = new Promise<void>((resolve, reject) => {
		if (existingScript) {
			existingScript.addEventListener("load", () => resolve(), {
				once: true,
			});
			existingScript.addEventListener("error", () => reject(), {
				once: true,
			});
			return;
		}

		const script = document.createElement("script");
		script.src = SCRIPT_SRC;
		script.async = true;
		script.addEventListener("load", () => resolve(), { once: true });
		script.addEventListener("error", () => reject(), { once: true });
		document.head.append(script);
	});

	return scriptLoadPromise;
}

function markError(root: HTMLElement, message = "评论加载失败") {
	root.dataset.twikooState = "error";
	root.textContent = message;
}

function initTwikoo(reason = "page-view") {
	const root = findRoot();
	if (!root) return;

	const config = readConfig(root);
	if (!config) {
		markError(root);
		return;
	}

	const initKey = buildInitKey(config);
	if (root.dataset[INIT_KEY_ATTR] === initKey) return;

	const currentVersion = ++initVersion;
	root.dataset.twikooState = "loading";

	ensureTwikooScript()
		.then(() => {
			if (currentVersion !== initVersion) return;
			if (!window.twikoo) {
				throw new Error(
					"Twikoo script loaded without exposing window.twikoo.",
				);
			}

			const activeRoot = findRoot();
			if (activeRoot !== root) return;

			root.innerHTML = "";
			const result = window.twikoo.init(config);
			return Promise.resolve(result);
		})
		.then(() => {
			if (currentVersion !== initVersion) return;
			const activeRoot = findRoot();
			if (activeRoot !== root) return;

			root.dataset.twikooState = "ready";
			root.dataset[INIT_KEY_ATTR] = initKey;
		})
		.catch((error) => {
			if (currentVersion !== initVersion) return;
			console.error(
				`[Twikoo] Failed to initialize during ${reason}.`,
				error,
			);
			markError(root);
		});
}

function scheduleInit(reason: string) {
	window.setTimeout(() => initTwikoo(reason), 0);
}

if (!window.__twikooCommentManager) {
	window.__twikooCommentManager = {
		init: scheduleInit,
	};

	if (document.readyState === "loading") {
		document.addEventListener(
			"DOMContentLoaded",
			() => scheduleInit("dom-ready"),
			{
				once: true,
			},
		);
	} else {
		scheduleInit("initial");
	}

	onPageLifecycle("content-replace", () => scheduleInit("content-replace"));
	onPageLifecycle("page-view", () => scheduleInit("page-view"));
} else {
	window.__twikooCommentManager.init("script-reused");
}
