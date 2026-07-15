const MOBILE_QUERY = "(max-width: 767px)";
const HOVER_QUERY = "(hover: hover)";
const CROSSFADE_DURATION_MS = 900;

let activeCleanup: (() => void) | undefined;

function getSlides(container: HTMLElement): HTMLElement[] {
	return Array.from(
		container.querySelectorAll<HTMLElement>("[data-banner-slide]"),
	);
}

function supportsViewport(slide: HTMLElement, mobile: boolean): boolean {
	return mobile
		? slide.dataset.hasMobile === "true"
		: slide.dataset.hasDesktop === "true";
}

async function materializeSlide(slide: HTMLElement): Promise<void> {
	const template = slide.querySelector<HTMLTemplateElement>(
		"template[data-banner-slide-content]",
	);
	if (template) {
		template.replaceWith(template.content.cloneNode(true));
	}

	const image = slide.querySelector<HTMLImageElement>("img");
	if (!image || image.complete) return;
	try {
		await image.decode();
	} catch {
		// A failed decode still leaves the browser fallback/error state visible.
	}
}

export function initBannerCarousel(container: HTMLElement): () => void {
	activeCleanup?.();

	const slides = getSlides(container);
	if (slides.length === 0) return () => {};

	const mobileQuery = window.matchMedia(MOBILE_QUERY);
	const hoverQuery = window.matchMedia(HOVER_QUERY);
	const interval = Math.max(
		Number.parseInt(container.dataset.carouselInterval || "8000", 10),
		1500,
	);
	container.style.setProperty(
		"--banner-frame-duration",
		`${interval + CROSSFADE_DURATION_MS}ms`,
	);
	container.style.setProperty(
		"--banner-crossfade-duration",
		`${CROSSFADE_DURATION_MS}ms`,
	);

	let currentSlide: HTMLElement | undefined;
	let timer: number | undefined;
	let transitionTimer: number | undefined;
	let timerStartedAt = 0;
	let remaining = interval;
	const pauseReasons = new Set<"hover" | "touch" | "visibility">();
	let transitioning = false;
	let touchStartX = 0;
	let touchStartY = 0;
	let horizontalSwipe = false;
	let operation = 0;

	function validSlides(): HTMLElement[] {
		return slides.filter((slide) =>
			supportsViewport(slide, mobileQuery.matches),
		);
	}

	function clearTimer() {
		window.clearTimeout(timer);
		timer = undefined;
	}

	function schedule(delay = interval) {
		clearTimer();
		remaining = delay;
		if (pauseReasons.size > 0 || validSlides().length <= 1) return;
		timerStartedAt = performance.now();
		timer = window.setTimeout(() => {
			timer = undefined;
			void switchBy(1);
		}, delay);
	}

	function activateInitialSlide() {
		const available = validSlides();
		currentSlide =
			available.find(
				(slide) =>
					slide.dataset.active === "true" &&
					slide.dataset.leaving !== "true",
			) || available[0];

		for (const slide of slides) {
			const active = slide === currentSlide;
			slide.dataset.active = String(active);
			slide.removeAttribute("data-leaving");
		}
	}

	function preloadFollowingSlide() {
		const available = validSlides();
		if (available.length <= 1) return;
		const currentIndex = Math.max(available.indexOf(currentSlide!), 0);
		const following = available[(currentIndex + 1) % available.length];
		void materializeSlide(following);
	}

	async function switchBy(offset: number) {
		if (transitioning) return;
		const available = validSlides();
		if (available.length <= 1) return;

		const currentIndex = Math.max(available.indexOf(currentSlide!), 0);
		const nextIndex =
			(currentIndex + offset + available.length) % available.length;
		const nextSlide = available[nextIndex];
		const previousSlide = currentSlide || available[currentIndex];
		if (nextSlide === previousSlide) return;

		transitioning = true;
		const currentOperation = ++operation;
		await materializeSlide(nextSlide);
		if (
			currentOperation !== operation ||
			pauseReasons.has("visibility") ||
			!container.isConnected
		) {
			transitioning = false;
			return;
		}
		currentSlide = nextSlide;
		nextSlide.dataset.active = "true";
		nextSlide.removeAttribute("data-leaving");
		previousSlide.dataset.leaving = "true";
		container.dataset.animating = "true";

		window.clearTimeout(transitionTimer);
		transitionTimer = window.setTimeout(() => {
			previousSlide.dataset.active = "false";
			previousSlide.removeAttribute("data-leaving");
			container.removeAttribute("data-animating");
			transitioning = false;
			preloadFollowingSlide();
			schedule();
		}, CROSSFADE_DURATION_MS);
	}

	function pause(reason: "hover" | "touch" | "visibility") {
		if (pauseReasons.size === 0 && timer !== undefined) {
			remaining = Math.max(
				0,
				remaining - (performance.now() - timerStartedAt),
			);
		}
		pauseReasons.add(reason);
		clearTimer();
		container.dataset.paused = "true";
	}

	function resume(reason: "hover" | "touch" | "visibility", reset = false) {
		pauseReasons.delete(reason);
		if (pauseReasons.size > 0) return;
		container.removeAttribute("data-paused");
		schedule(reset ? interval : Math.max(remaining, 250));
	}

	function onVisibilityChange() {
		if (document.hidden) pause("visibility");
		else resume("visibility");
	}

	function onPointerEnter() {
		if (hoverQuery.matches) pause("hover");
	}

	function onPointerLeave() {
		if (hoverQuery.matches) resume("hover");
	}

	function onTouchStart(event: TouchEvent) {
		const touch = event.touches[0];
		if (!touch) return;
		touchStartX = touch.clientX;
		touchStartY = touch.clientY;
		horizontalSwipe = false;
		pause("touch");
	}

	function onTouchMove(event: TouchEvent) {
		const touch = event.touches[0];
		if (!touch || touchStartX === 0 || touchStartY === 0) return;
		const deltaX = Math.abs(touch.clientX - touchStartX);
		const deltaY = Math.abs(touch.clientY - touchStartY);
		if (deltaX > deltaY && deltaX > 30) {
			horizontalSwipe = true;
			event.preventDefault();
		}
	}

	function onTouchEnd(event: TouchEvent) {
		const touch = event.changedTouches[0];
		if (touch && horizontalSwipe) {
			const deltaX = touchStartX - touch.clientX;
			if (Math.abs(deltaX) > 50) void switchBy(deltaX > 0 ? 1 : -1);
		}
		touchStartX = 0;
		touchStartY = 0;
		horizontalSwipe = false;
		resume("touch", true);
	}

	function onViewportChange() {
		operation += 1;
		window.clearTimeout(transitionTimer);
		transitioning = false;
		container.removeAttribute("data-animating");
		activateInitialSlide();
		void materializeSlide(currentSlide!);
		preloadFollowingSlide();
		schedule();
	}

	activateInitialSlide();
	void materializeSlide(currentSlide!);
	preloadFollowingSlide();
	container.addEventListener("mouseenter", onPointerEnter);
	container.addEventListener("mouseleave", onPointerLeave);
	container.addEventListener("touchstart", onTouchStart, { passive: true });
	container.addEventListener("touchmove", onTouchMove, { passive: false });
	container.addEventListener("touchend", onTouchEnd, { passive: true });
	document.addEventListener("visibilitychange", onVisibilityChange);
	mobileQuery.addEventListener("change", onViewportChange);
	schedule();

	const cleanup = () => {
		operation += 1;
		clearTimer();
		window.clearTimeout(transitionTimer);
		container.removeEventListener("mouseenter", onPointerEnter);
		container.removeEventListener("mouseleave", onPointerLeave);
		container.removeEventListener("touchstart", onTouchStart);
		container.removeEventListener("touchmove", onTouchMove);
		container.removeEventListener("touchend", onTouchEnd);
		document.removeEventListener("visibilitychange", onVisibilityChange);
		mobileQuery.removeEventListener("change", onViewportChange);
		container.removeAttribute("data-animating");
		container.removeAttribute("data-paused");
	};

	activeCleanup = cleanup;
	return cleanup;
}

export function initBannerCarouselFromDocument(): void {
	const container = document.getElementById("banner-carousel");
	if (container) initBannerCarousel(container);
}
