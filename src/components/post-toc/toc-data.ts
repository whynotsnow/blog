import type { MarkdownHeading } from "astro";

export interface TocSourceHeading {
	depth: number;
	slug: string;
	text: string;
}

export interface TocItem {
	id: string;
	text: string;
	depth: number;
	level: number;
	badge: string;
	badgeKind: "text" | "square" | "dot";
}

const JAPANESE_KATAKANA = [
	"ア",
	"イ",
	"ウ",
	"エ",
	"オ",
	"カ",
	"キ",
	"ク",
	"ケ",
	"コ",
	"サ",
	"シ",
	"ス",
	"セ",
	"ソ",
	"タ",
	"チ",
	"ツ",
	"テ",
	"ト",
	"ナ",
	"ニ",
	"ヌ",
	"ネ",
	"ノ",
	"ハ",
	"ヒ",
	"フ",
	"ヘ",
	"ホ",
	"マ",
	"ミ",
	"ム",
	"メ",
	"モ",
	"ヤ",
	"ユ",
	"ヨ",
	"ラ",
	"リ",
	"ル",
	"レ",
	"ロ",
	"ワ",
	"ヲ",
	"ン",
];

export function cleanTocText(text: string) {
	return text.replace(/#+\s*$/, "");
}

export function collectTocHeadings(root: Element): TocSourceHeading[] {
	return Array.from(root.querySelectorAll("h1, h2, h3, h4, h5, h6"))
		.filter((heading): heading is HTMLHeadingElement => Boolean(heading.id))
		.map((heading) => ({
			depth: Number.parseInt(heading.tagName.substring(1), 10),
			slug: heading.id,
			text: cleanTocText(heading.textContent || ""),
		}));
}

export function buildTocItems(
	headings: Array<MarkdownHeading | TocSourceHeading>,
	options: {
		maxDepth: number;
		useJapaneseBadge: boolean;
	},
): TocItem[] {
	if (headings.length === 0) return [];

	const minDepth = Math.min(...headings.map((heading) => heading.depth));
	let rootCount = 1;

	return headings
		.filter((heading) => heading.depth < minDepth + options.maxDepth)
		.map((heading) => {
			const level = heading.depth - minDepth;
			let badge = "";
			if (level === 0) {
				const badgeIndex = rootCount - 1;
				badge =
					options.useJapaneseBadge &&
					badgeIndex < JAPANESE_KATAKANA.length
						? JAPANESE_KATAKANA[badgeIndex]
						: rootCount.toString();
				rootCount++;
			}

			return {
				id: heading.slug,
				text: cleanTocText(heading.text),
				depth: heading.depth,
				level,
				badge,
				badgeKind:
					level === 0 ? "text" : level === 1 ? "square" : "dot",
			};
		});
}
