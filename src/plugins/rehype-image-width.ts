import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";

export function rehypeImageWidth(): (tree: Root) => void {
	const regex = / w-([0-9]+)%/;

	return function transform(tree: Root): void {
		visit(tree, "element", (node, index, parent) => {
			if (
				node.tagName === "img" &&
				node.properties &&
				node.properties.alt
			) {
				const alt = String(node.properties.alt);
				const match = alt.match(regex);

				if (match) {
					const width = match[1];
					node.properties.alt = alt.replace(regex, "").trim();
					node.properties.width = `${width}%`;
					node.properties.style = "display: block; margin: 0 auto;";

					const figureChildren: Element["children"] = [node];

					if (node.properties.title) {
						const figcaption: Element = {
							type: "element",
							tagName: "figcaption",
							properties: {
								style: "text-align: center; margin-top: 0.5em; font-size: var(--text-ui-size); color: #666;",
							},
							children: [
								{
									type: "text",
									value: String(node.properties.title),
								},
							],
						};
						figureChildren.push(figcaption);
					}

					const figure: Element = {
						type: "element",
						tagName: "figure",
						properties: {
							style: "margin: 1em 0;",
						},
						children: figureChildren,
					};

					if (parent && index !== undefined) {
						parent.children[index] = figure;
					}
				}
			}
		});
	};
}
