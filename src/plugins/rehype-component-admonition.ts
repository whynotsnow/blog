import { h } from "hastscript";
import type { Element, ElementContent } from "hast";

type AdmonitionType = "tip" | "note" | "important" | "caution" | "warning";
type DirectiveProperties = Record<string, unknown>;

/**
 * Creates an admonition component.
 *
 * @param {Object} properties - The properties of the component.
 * @param {string} [properties.title] - An optional title.
 * @param {('tip'|'note'|'important'|'caution'|'warning')} type - The admonition type.
 * @param {import('mdast').RootContent[]} children - The children elements of the component.
 * @returns {import('mdast').Parent} The created admonition component.
 */
export function AdmonitionComponent(
	properties: DirectiveProperties,
	children: Element[],
	type: AdmonitionType,
): Element {
	if (!Array.isArray(children) || children.length === 0)
		return h(
			"div",
			{ class: "hidden" },
			'Invalid admonition directive. (Admonition directives must be of block type ":::note{name="name"} <content> :::")',
		);

	let label: ElementContent | string = type.toUpperCase();
	if (properties?.["has-directive-label"]) {
		const directiveLabel = children[0];
		if (!directiveLabel) return h("div", { class: "hidden" });
		children = children.slice(1);
		directiveLabel.tagName = "div"; // Change the tag <p> to <div>
		label = directiveLabel;
	}

	return h("blockquote", { class: `admonition bdm-${type}` }, [
		h("span", { class: "bdm-title" }, label),
		...children,
	]);
}
