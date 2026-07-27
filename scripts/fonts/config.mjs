export const FONT_BUILD_VERSION = 1;

export const FONT_BUILD_DIR = ".font-build";

export const FONT_PACKAGES = [
	{
		id: "latin",
		family: "Zen Maru Gothic",
		cssVariable: "--font-latin",
		source: "scripts/fonts/source/zen-maru-gothic-medium.ttf",
		output: "zen-maru-gothic-latin-500.woff2",
		weight: 500,
		style: "normal",
		charset: "ascii",
		locales: ["*"],
		unicodeRange: ["U+0020-007E"],
		preload: true,
	},
	{
		id: "cjk",
		family: "Lolita V2",
		cssVariable: "--font-cjk",
		source: "scripts/fonts/source/lolita-v2-regular.ttf",
		output: "lolita-v2-cjk-400.woff2",
		weight: 400,
		style: "normal",
		charset: "site-cjk",
		locales: ["zh-CN", "zh-TW", "ja", "ko"],
		unicodeRange: [
			"U+3000-303F",
			"U+3040-30FF",
			"U+3400-4DBF",
			"U+4E00-9FFF",
			"U+AC00-D7AF",
			"U+F900-FAFF",
			"U+FF00-FFEF",
		],
		preload: false,
	},
];
