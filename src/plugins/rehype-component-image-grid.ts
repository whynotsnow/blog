import { h } from "hastscript";
import type { Element, RootContent } from "hast";

type ImageGridProperties = {
	columns?: unknown;
	aspect?: unknown;
	fit?: unknown;
};

const DEFAULT_COLUMNS = 3;
const DEFAULT_ASPECT_RATIO = "16 / 10";
const DEFAULT_FIT = "cover";

let gallerySequence = 0;

function parseColumns(value: unknown): number {
	const columns = Number.parseInt(String(value ?? DEFAULT_COLUMNS), 10);
	return Number.isInteger(columns) && columns >= 1 && columns <= 6
		? columns
		: DEFAULT_COLUMNS;
}

function parseAspectRatio(value: unknown): string {
	if (typeof value !== "string") {
		return DEFAULT_ASPECT_RATIO;
	}

	const match = value.match(
		/^\s*(?<width>\d+(?:\.\d+)?)\s*\/\s*(?<height>\d+(?:\.\d+)?)\s*$/,
	);
	if (!match?.groups) {
		return DEFAULT_ASPECT_RATIO;
	}

	const { width, height } = match.groups;
	if (Number(width) <= 0 || Number(height) <= 0) {
		return DEFAULT_ASPECT_RATIO;
	}

	return `${width} / ${height}`;
}

function parseFit(value: unknown): string {
	return value === "contain" ? "contain" : DEFAULT_FIT;
}

function findImages(nodes: RootContent[] = []): Element[] {
	const images: Element[] = [];

	const visit = (node: RootContent): void => {
		if (node.type === "element" && node.tagName === "img") {
			images.push(node);
			return;
		}

		if ("children" in node && Array.isArray(node.children)) {
			for (const child of node.children) {
				visit(child);
			}
		}
	};

	for (const node of nodes) {
		visit(node);
	}

	return images;
}

export function ImageGridComponent(
	properties: ImageGridProperties,
	children: RootContent[],
): Element {
	const images = findImages(children);
	if (images.length === 0) {
		return h(
			"div",
			{ class: "hidden" },
			'Invalid image grid. (Use a block directive containing one or more Markdown images: ":::grid ... :::")',
		);
	}

	const galleryId = `image-grid-${gallerySequence++}`;
	const columns = parseColumns(properties?.columns);
	const aspectRatio = parseAspectRatio(properties?.aspect);
	const fit = parseFit(properties?.fit);

	const items = images.map((image) => {
		const src = String(image.properties?.src ?? "");
		const alt = String(image.properties?.alt ?? "");
		const title = String(image.properties?.title ?? alt);

		return h("figure", { class: "image-grid__item" }, [
			h(
				"a",
				{
					class: "image-grid__link no-styling",
					href: src,
					"data-fancybox": galleryId,
					"data-no-swup": "true",
					"data-caption": title,
				},
				[image],
			),
			title
				? h("figcaption", { class: "image-grid__caption" }, title)
				: null,
		]);
	});

	return h(
		"div",
		{
			class: "image-grid",
			"data-columns": String(columns),
			style: `--image-grid-columns: ${columns}; --image-grid-aspect-ratio: ${aspectRatio}; --image-grid-fit: ${fit};`,
		},
		items,
	);
}
