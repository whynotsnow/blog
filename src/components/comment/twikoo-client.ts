import { onPageLifecycle } from "@/utils/page-lifecycle";
import twikooThemeCss from "./twikoo-theme.css?raw";

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
const SCRIPT_SRC = "/assets/js/twikoo.nocss.js";
const STYLE_SRC = "/assets/css/twikoo.css";
const INIT_KEY_ATTR = "twikooInitializedKey";
const THEME_STYLE_ID = "twikoo-theme-overrides";

let scriptLoadPromise: Promise<void> | null = null;
let styleLoadPromise: Promise<void> | null = null;
let initVersion = 0;
let themeStyleObserver: MutationObserver | null = null;

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

function ensureTwikooStylesheet() {
	const existingLink = document.querySelector<HTMLLinkElement>(
		`link[rel="stylesheet"][href="${STYLE_SRC}"]`,
	);

	if (existingLink?.dataset.loaded === "true") {
		return Promise.resolve();
	}
	if (existingLink && styleLoadPromise) return styleLoadPromise;

	if (!existingLink) {
		styleLoadPromise = null;
	}

	styleLoadPromise = new Promise<void>((resolve, reject) => {
		if (existingLink) {
			existingLink.addEventListener(
				"load",
				() => {
					existingLink.dataset.loaded = "true";
					styleLoadPromise = null;
					resolve();
				},
				{ once: true },
			);
			existingLink.addEventListener(
				"error",
				() => {
					styleLoadPromise = null;
					reject();
				},
				{
					once: true,
				},
			);
			return;
		}

		const link = document.createElement("link");
		link.rel = "stylesheet";
		link.href = STYLE_SRC;
		link.dataset.twikooStylesheet = "official";
		link.addEventListener(
			"load",
			() => {
				link.dataset.loaded = "true";
				styleLoadPromise = null;
				resolve();
			},
			{ once: true },
		);
		link.addEventListener(
			"error",
			() => {
				styleLoadPromise = null;
				reject();
			},
			{ once: true },
		);
		document.head.append(link);
	});

	return styleLoadPromise;
}

function markError(root: HTMLElement, message = "评论加载失败") {
	root.dataset.twikooState = "error";
	root.textContent = message;
}

function ensureTwikooThemeStyle() {
	let style = document.getElementById(
		THEME_STYLE_ID,
	) as HTMLStyleElement | null;
	if (!style) {
		style = document.createElement("style");
		style.id = THEME_STYLE_ID;
		style.dataset.twikooTheme = "site";
	}

	if (style.textContent !== twikooThemeCss) {
		style.textContent = twikooThemeCss;
	}

	if (style.parentElement !== document.head || style.nextSibling) {
		document.head.append(style);
	}
}

function scheduleThemeStyleRefresh() {
	ensureTwikooThemeStyle();
	window.requestAnimationFrame(ensureTwikooThemeStyle);
	window.setTimeout(ensureTwikooThemeStyle, 0);
	window.setTimeout(ensureTwikooThemeStyle, 120);
	window.setTimeout(ensureTwikooThemeStyle, 500);
	window.setTimeout(ensureTwikooThemeStyle, 1500);
	window.setTimeout(ensureTwikooThemeStyle, 3000);
}

function watchTwikooThemeStyleOrder() {
	if (themeStyleObserver) return;

	themeStyleObserver = new MutationObserver((mutations) => {
		const addedStyle = mutations.some((mutation) =>
			Array.from(mutation.addedNodes).some(
				(node) =>
					node instanceof HTMLStyleElement ||
					(node instanceof HTMLLinkElement &&
						node.rel === "stylesheet"),
			),
		);
		if (!addedStyle) return;

		window.queueMicrotask(ensureTwikooThemeStyle);
	});
	themeStyleObserver.observe(document.head, { childList: true });
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
	root.dataset[INIT_KEY_ATTR] = initKey;

	Promise.all([ensureTwikooStylesheet(), ensureTwikooScript()])
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
			watchTwikooThemeStyleOrder();
			ensureTwikooThemeStyle();
			const result = window.twikoo.init(config);
			scheduleThemeStyleRefresh();
			return Promise.resolve(result).then(() => {
				scheduleThemeStyleRefresh();
			});
		})
		.then(() => {
			if (currentVersion !== initVersion) return;
			const activeRoot = findRoot();
			if (activeRoot !== root) return;

			root.dataset.twikooState = "ready";
		})
		.catch((error) => {
			if (currentVersion !== initVersion) return;
			console.error(
				`[Twikoo] Failed to initialize during ${reason}.`,
				error,
			);
			delete root.dataset[INIT_KEY_ATTR];
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
