/// <reference types="astro/client" />
/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
	readonly UMAMI_API_KEY?: string;
	readonly GTM_ID?: string;
	readonly CLARITY_PROJECT_ID?: string;
	readonly MONGODB_URI?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
