import type { Root } from "mdast";
import { visit } from "unist-util-visit";

const GITHUB_ALERT_DECLARATION_REGEX = /^\s*\[!(?<type>\w+)\]\s*$/;
const GITHUB_ALERT_TYPES = ["NOTE", "TIP", "IMPORTANT", "WARNING", "CAUTION"];
const TYPE_TO_DIRECTIVE_NAME = {
	NOTE: "note",
	TIP: "tip",
	IMPORTANT: "important",
	WARNING: "warning",
	CAUTION: "caution",
} as const;

type GithubAlertType = keyof typeof TYPE_TO_DIRECTIVE_NAME;
type UnknownParent = {
	children: unknown[];
};

function parseGithubAlertDeclaration(text: string): GithubAlertType | null {
	const match = text.match(GITHUB_ALERT_DECLARATION_REGEX);
	const type = match?.groups?.type?.toUpperCase();
	return GITHUB_ALERT_TYPES.includes(type ?? "")
		? (type as GithubAlertType)
		: null;
}

export function remarkFixGithubAdmonitions(): (tree: Root) => void {
	return function transform(tree: Root): void {
		visit(tree, "blockquote", (node, index, parent) => {
			if (!parent || index === undefined) return;

			const firstChild = node.children[0];
			if (firstChild?.type !== "paragraph") return;

			const firstParagraphChild = firstChild.children[0];
			if (firstParagraphChild?.type !== "text") return;

			const possibleTypeDeclaration =
				firstParagraphChild.value.split("\n")[0];
			if (!possibleTypeDeclaration) return;

			const type = parseGithubAlertDeclaration(possibleTypeDeclaration);
			if (!type) return;

			const directiveName = TYPE_TO_DIRECTIVE_NAME[type];
			if (!directiveName) return;

			const textNodeChildren =
				firstParagraphChild.value.split("\n").length > 1
					? [
							{
								type: "text",
								value: firstParagraphChild.value
									.split("\n")
									.slice(1)
									.join("\n"),
							},
						]
					: [];

			const paragraphChildren = [
				...textNodeChildren,
				...firstChild.children.slice(1),
			];

			const alertParagraphChildren =
				paragraphChildren.length > 0
					? [{ type: "paragraph", children: paragraphChildren }]
					: [];

			const directive = {
				type: "containerDirective",
				name: directiveName,
				children: [
					...alertParagraphChildren,
					...node.children.slice(1),
				],
			};

			(parent as UnknownParent).children[index] = directive;
		});
	};
}
