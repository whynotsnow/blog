export {};

import type { SiteConfig } from "./types/config";
import type { panelManager } from "./utils/panel-manager";
import type { onPageLifecycle } from "./utils/page-lifecycle";

type SwupHookName =
	| "animation:out:start"
	| "animation:in:start"
	| "content:replace"
	| "history:popstate"
	| "link:click"
	| "page:view"
	| "visit:start"
	| "visit:end";

interface SwupInstance {
	hooks: {
		on: (
			event: SwupHookName | string,
			callback: (...args: unknown[]) => void,
		) => void;
		off: (
			event: SwupHookName | string,
			callback?: (...args: unknown[]) => void,
		) => void;
	};
	navigate: (url: string, options?: { history?: boolean }) => void;
	preload?: (url: string) => void;
}

declare global {
	interface HTMLElementTagNameMap {
		"table-of-contents": HTMLElement & {
			init?: () => void;
			refreshRuntimeHeadings?: (root?: Element) => void;
			regenerateTOC?: (retryCount?: number, root?: Element) => void;
		};
	}

	interface Window {
		// Define swup type directly since @swup/astro doesn't export AstroIntegration
		swup: SwupInstance;
		pagefind: {
			search: (query: string) => Promise<{
				results: Array<{
					data: () => Promise<SearchResult>;
				}>;
			}>;
		};

		CryptoJS?: {
			AES: {
				decrypt: (
					content: string,
					password: string,
				) => {
					toString: (encoder: unknown) => string;
				};
			};
			enc: {
				Utf8: unknown;
			};
		};
		Fancybox?: {
			bind?: (selector: string, options: Record<string, unknown>) => void;
			unbind?: (selector: string) => void;
		};
		hljs?: {
			highlightElement: (element: Element) => void;
		};
		mobileTOCInit?: (runtimeRoot?: Element) => void;
		renderMermaidDiagrams?: () => void;
		initSemifullScrollDetection?: () => void;
		applyWallpaperMode?: () => void;
		onPageLifecycle?: typeof onPageLifecycle;
		sakuraInitialized?: boolean;
		semifullScrollHandler?: EventListener;
		panelManager?: typeof panelManager;
		oddmisc?: {
			getSiteStats: () => Promise<{
				pageviews?: number;
				visits?: number;
				visitors?: number;
			}>;
			getStats: (path: string) => Promise<{
				pageviews?: number;
				visits?: number;
				visitors?: number;
			}>;
		};
		siteConfig: SiteConfig;
	}
}

interface SearchResult {
	url: string;
	meta: {
		title: string;
	};
	excerpt: string;
	content?: string;
	word_count?: number;
	filters?: Record<string, unknown>;
	anchors?: Array<{
		element: string;
		id: string;
		text: string;
		location: number;
	}>;
	weighted_locations?: Array<{
		weight: number;
		balanced_score: number;
		location: number;
	}>;
	locations?: number[];
	raw_content?: string;
	raw_url?: string;
	sub_results?: SearchResult[];
}

export { SearchResult };
