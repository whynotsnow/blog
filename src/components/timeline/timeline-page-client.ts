export function initTimelinePage() {
	const timelineNodes = document.querySelectorAll(".timeline-node");
	timelineNodes.forEach((node, index) => {
		(node as HTMLElement).style.animationDelay = `${index * 0.2}s`;
	});
}

function scheduleTimelineInit() {
	setTimeout(initTimelinePage, 100);
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initTimelinePage);
} else {
	initTimelinePage();
}

document.addEventListener("astro:page-load", scheduleTimelineInit);
document.addEventListener("astro:after-swap", scheduleTimelineInit);
window.onPageLifecycle?.("content-replace", scheduleTimelineInit);
window.onPageLifecycle?.("page-view", scheduleTimelineInit);
