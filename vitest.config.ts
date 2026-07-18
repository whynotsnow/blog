/// <reference types="node" />

import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
			"@constants": fileURLToPath(
				new URL("./src/constants", import.meta.url),
			),
			"@i18n": fileURLToPath(new URL("./src/i18n", import.meta.url)),
			"@utils": fileURLToPath(new URL("./src/utils", import.meta.url)),
		},
	},
	test: {
		environment: "node",
		include: ["tests/{unit,integration}/**/*.test.ts"],
	},
});
