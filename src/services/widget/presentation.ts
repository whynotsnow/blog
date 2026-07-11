import type { WidgetInstanceConfig } from "./types";

export function resolveWidgetClass(widget: WidgetInstanceConfig): string {
	return widget.class ?? "";
}

export function resolveWidgetStyle(
	widget: WidgetInstanceConfig,
	index: number,
): string | undefined {
	const styles = [widget.style];
	const delay = widget.animationDelay ?? index * 50;
	if (delay > 0) styles.push(`animation-delay: ${delay}ms`);
	return styles.filter(Boolean).join("; ") || undefined;
}
