export function initTimelinePage() {
	if (window.__iconifyLoader) {
		window.__iconifyLoader
			.load()
			.then(() => {
				const timelineItems =
					document.querySelectorAll(".timeline-item");
				timelineItems.forEach((item) => {
					item.dispatchEvent(new CustomEvent("iconify-ready"));
				});
			})
			.catch((error) => {
				console.error("Failed to load icons on timeline page:", error);
			});
	}

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

window.addEventListener("pageshow", (event) => {
	if (event.persisted && window.__iconifyLoader) {
		setTimeout(() => {
			window.__iconifyLoader?.load().catch(console.error);
		}, 100);
	}
});

document.addEventListener("astro:page-load", scheduleTimelineInit);
document.addEventListener("astro:after-swap", scheduleTimelineInit);
window.onPageLifecycle?.("content-replace", scheduleTimelineInit);
window.onPageLifecycle?.("page-view", scheduleTimelineInit);
