import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fa7Solid from "@iconify-json/fa7-solid/icons.json" with { type: "json" };
import materialSymbols from "@iconify-json/material-symbols/icons.json" with { type: "json" };
import mdi from "@iconify-json/mdi/icons.json" with { type: "json" };

const iconSets = {
	"fa7-solid": {
		data: fa7Solid,
		outputDir: "src/assets/icons/fa7-solid",
	},
	"material-symbols": {
		data: materialSymbols,
		outputDir: "src/assets/icons/material-symbols",
	},
	mdi: {
		data: mdi,
		outputDir: "src/assets/icons/mdi",
	},
};

const defaultIcons = {
	"fa7-solid": ["chevron-right"],
	"material-symbols": [
		"airwave-rounded",
		"article-outline",
		"article-outline-rounded",
		"book-2-outline-rounded",
		"calendar-today-outline-rounded",
		"check-circle",
		"check",
		"chevron-left-rounded",
		"chevron-right-rounded",
		"close",
		"close-rounded",
		"dark-mode-outline-rounded",
		"download",
		"error",
		"expand-less",
		"format-list-bulleted",
		"format-list-bulleted-rounded",
		"format-list-numbered-rounded",
		"full-coverage-outline-rounded",
		"graphic-eq-rounded",
		"grid-view-rounded",
		"hide-image-outline",
		"image-outline",
		"keyboard-arrow-down-rounded",
		"link",
		"more-horiz",
		"pause",
		"pause-rounded",
		"play-arrow",
		"play-arrow-rounded",
		"queue-music-rounded",
		"refresh",
		"repeat-one-rounded",
		"repeat-rounded",
		"search",
		"shuffle-rounded",
		"skip-next-rounded",
		"skip-previous-rounded",
		"spa-outline-rounded",
		"titlecase-rounded",
		"view-carousel-outline-rounded",
		"visibility-off",
		"visibility-off-rounded",
		"volume-down-rounded",
		"volume-off-rounded",
		"volume-up-rounded",
		"wallpaper",
		"wb-sunny-outline-rounded",
	],
	mdi: ["pin"],
};

function resolveIconData(iconSet, name) {
	const icon = iconSet.icons[name];
	if (!icon) {
		throw new Error(`Icon not found: ${iconSet.prefix}:${name}`);
	}

	return {
		body: icon.body,
		height: icon.height ?? iconSet.height ?? 24,
		left: icon.left ?? 0,
		top: icon.top ?? 0,
		width: icon.width ?? iconSet.width ?? 24,
	};
}

function renderSvg(icon) {
	return [
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${icon.left} ${icon.top} ${icon.width} ${icon.height}">`,
		icon.body,
		"</svg>",
		"",
	].join("\n");
}

function parseIconNames(argv) {
	if (argv.length === 0) {
		return defaultIcons;
	}

	return argv.reduce((result, value) => {
		const [prefix, name] = value.split(":");
		if (!prefix || !name || !iconSets[prefix]) {
			throw new Error(
				`Use icon names like material-symbols:airwave-rounded. Invalid value: ${value}`,
			);
		}
		result[prefix] ??= [];
		result[prefix].push(name);
		return result;
	}, {});
}

const root = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../..",
);
const requestedIcons = parseIconNames(process.argv.slice(2));

for (const [prefix, names] of Object.entries(requestedIcons)) {
	const iconSet = iconSets[prefix];
	const outputDir = path.join(root, iconSet.outputDir);
	fs.mkdirSync(outputDir, { recursive: true });

	for (const name of [...new Set(names)].sort()) {
		const icon = resolveIconData(iconSet.data, name);
		const target = path.join(outputDir, `${name}.svg`);
		fs.writeFileSync(target, renderSvg(icon));
		console.log(`exported ${prefix}:${name}`);
	}
}
