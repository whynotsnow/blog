/// <reference types="node" />

import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
			"@i18n": fileURLToPath(new URL("./src/i18n", import.meta.url)),
		},
	},
	test: {
		environment: "node",
		include: ["tests/{unit,integration}/**/*.test.ts"],
	},
});
