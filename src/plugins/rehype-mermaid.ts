import { h } from "hastscript";
import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";
import mermaidRenderScript from "./mermaid-render-script.js?raw";

const mermaidRuntimeUrl = "/assets/js/mermaid-11.17.2.min.js";

export function rehypeMermaid(): (tree: Root) => void {
	return function transform(tree: Root): void {
		let diagramIndex = 0;
		let scriptInjected = false;

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
				const mermaidCode = String(
					node.properties["data-mermaid-code"] || "",
				);
				const mermaidId = `mermaid-diagram-${diagramIndex++}`;

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
							},
							mermaidCode,
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
						`window.__mermaidRuntimeUrl = ${JSON.stringify(mermaidRuntimeUrl)};\n${mermaidRenderScript}`,
					);
					node.children.push(renderScript);
				}
			}
		});
	};
}
