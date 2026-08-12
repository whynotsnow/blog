import type { Root } from "mdast";
import { visit } from "unist-util-visit";

type DirectiveNode = {
	type: "containerDirective" | "leafDirective" | "textDirective";
	name: string;
	attributes?: Record<string, unknown>;
	data?: {
		hName?: string;
		hProperties?: Record<string, unknown>;
	};
	children?: Array<{
		data?: {
			directiveLabel?: boolean;
		};
	}>;
};

function isDirectiveNode(node: unknown): node is DirectiveNode {
	if (!node || typeof node !== "object" || !("type" in node)) return false;
	const { type } = node;
	return (
		type === "containerDirective" ||
		type === "leafDirective" ||
		type === "textDirective"
	);
}

export function parseDirectiveNode(): (tree: Root) => void {
	return function transform(tree: Root): void {
		visit(tree, (node) => {
			const candidate: unknown = node;
			if (!isDirectiveNode(candidate)) return;

			const data = candidate.data || (candidate.data = {});
			candidate.attributes = candidate.attributes || {};
			if (
				Array.isArray(candidate.children) &&
				candidate.children.length > 0 &&
				candidate.children[0]?.data?.directiveLabel
			) {
				// Add a flag to the node to indicate that it has a directive label
				candidate.attributes["has-directive-label"] = true;
			}

			data.hName = candidate.name;
			data.hProperties = candidate.attributes;
		});
	};
}
