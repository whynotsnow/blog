import { h } from "hastscript";
import { fromHtml } from "hast-util-from-html";
import type { Element, Root, RootContent } from "hast";
import { visit } from "unist-util-visit";
import mermaidRenderScript from "./mermaid-render-script.js?raw";
import { MERMAID_RUNTIME_URL, prerenderMermaidSvg } from "./mermaid-prerender";

type MarkdownFile = {
	path?: string;
};

function parseSvgFragment(svg: string): RootContent[] {
	const root = fromHtml(svg, { fragment: true }) as Root;
	return root.children.filter((child) => child.type === "element");
}

export function rehypeMermaid(): (
	tree: Root,
	file?: MarkdownFile,
) => Promise<void> {
	return async function transform(
		tree: Root,
		file?: MarkdownFile,
	): Promise<void> {
		let diagramIndex = 0;
		let scriptInjected = false;

		const mermaidNodes: Element[] = [];
		visit(tree, "element", (node) => {
			const className = node.properties?.className;
			const classNames = Array.isArray(className)
				? className.map(String)
				: typeof className === "string"
					? className.split(/\s+/)
					: [];

			if (
				node.tagName === "div" &&
				classNames.includes("mermaid-container")
			) {
				mermaidNodes.push(node);
			}
		});

		for (const node of mermaidNodes) {
			const mermaidCode = String(
				node.properties["data-mermaid-code"] || "",
			);
			const mermaidId = `mermaid-diagram-${diagramIndex++}`;
			const prerendered = await prerenderMermaidSvg(mermaidCode, {
				sourcePath: file?.path,
				diagramId: mermaidId,
			});
			const mermaidChildren = prerendered
				? parseSvgFragment(prerendered.svg)
				: [{ type: "text" as const, value: mermaidCode }];

			// 创建 Mermaid 容器
			const mermaidContainer: Element = h(
				"div",
				{
					class: "mermaid-wrapper",
					id: mermaidId,
				},
				[
					h(
						"div",
						{
							class: "mermaid",
							"data-mermaid-code": mermaidCode,
							"data-mermaid-state": prerendered
								? "rendered"
								: "pending",
							"data-mermaid-theme": prerendered
								? "default"
								: undefined,
							"data-mermaid-prerendered": prerendered
								? "true"
								: undefined,
							"data-mermaid-cache-key": prerendered?.cacheKey,
						},
						mermaidChildren,
					),
				],
			);

			// 替换原始节点
			node.tagName = "div";
			node.properties = { class: "mermaid-diagram-container" };
			node.children = [mermaidContainer];

			if (!scriptInjected) {
				scriptInjected = true;
				// 创建客户端渲染脚本
				const renderScript: Element = h(
					"script",
					{
						type: "text/javascript",
					},
					`window.__mermaidRuntimeUrl = ${JSON.stringify(MERMAID_RUNTIME_URL)};\n${mermaidRenderScript}`,
				);
				node.children.push(renderScript);
			}
		}
	};
}
