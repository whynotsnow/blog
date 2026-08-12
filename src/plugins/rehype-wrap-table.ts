import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";

export function rehypeWrapTable(): (tree: Root) => void {
	return function transform(tree: Root): void {
		visit(tree, "element", (node, index, parent) => {
			if (node.tagName === "table" && parent && index !== undefined) {
				// 创建包装器 div
				const wrapper: Element = {
					type: "element",
					tagName: "div",
					properties: {
						className: ["table-wrapper"],
					},
					children: [node],
				};

				// 替换原始的 table 节点
				parent.children[index] = wrapper;
			}
		});
	};
}
