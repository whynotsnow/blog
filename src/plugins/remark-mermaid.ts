import type { Root } from "mdast";
import { visit } from "unist-util-visit";

export function remarkMermaid(): (tree: Root) => void {
	return function transform(tree: Root): void {
		visit(tree, "code", (node) => {
			if (node.lang === "mermaid") {
				const mermaidNode = node as unknown as {
					type: string;
					data?: {
						hName?: string;
						hProperties?: Record<string, unknown>;
					};
				};
				// 将 mermaid 代码块转换为自定义节点类型
				mermaidNode.type = "mermaid";
				mermaidNode.data = {
					hName: "div",
					hProperties: {
						className: ["mermaid-container"],
						"data-mermaid-code": node.value,
					},
				};
			}
		});
	};
}
