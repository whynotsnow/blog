import type { CalendarWidgetData } from "@/services/widget/data/calendar";
import { onPageLifecycle } from "@/utils/page-lifecycle";

interface CalendarWidgetConfig extends CalendarWidgetData {
	monthNames: string[];
	yearSuffix: string;
}

type CalendarView = "day" | "month" | "year";

const DATA_ID = "calendar-widget-data";

function normalizePath(path: string): string {
	return decodeURIComponent(path).replace(/\/$/, "");
}

function readCalendarConfig(): CalendarWidgetConfig | null {
	const dataElement = document.getElementById(DATA_ID);
	if (!dataElement?.textContent) return null;

	try {
		return JSON.parse(dataElement.textContent) as CalendarWidgetConfig;
	} catch (error) {
		console.error("Failed to parse calendar widget data:", error);
		return null;
	}
}

export function initCalendarWidget() {
	const widget = document.getElementById("calendar-widget");
	if (!widget || widget.dataset.calendarInitialized === "true") return;

	const config = readCalendarConfig();
	if (!config) return;

	const { monthNames, yearSuffix, posts, stats, postDateMap, postsByMonth } =
		config;

	const now = new Date();
	const todayYear = now.getFullYear();
	const todayMonth = now.getMonth();
	const todayDate = now.getDate();

	let currentYear = todayYear;
	let currentMonth = todayMonth;
	let selectedDateKey: string | null = null;
	let currentView: CalendarView = "day";

	const dom = {
		titleContainer: document.getElementById("calendar-title-container")!,
		title: document.getElementById("calendar-title")!,
		prevBtn: document.getElementById("prev-month-btn")!,
		nextBtn: document.getElementById("next-month-btn")!,
		backTodayBtn: document.getElementById("back-to-today-btn")!,
		selectionPanel: document.getElementById("selection-panel")!,
		selectionContent: document.getElementById("selection-content")!,
		grid: document.getElementById("calendar-grid")!,
		postsList: document.getElementById("calendar-posts-list")!,
		divider: document.getElementById("calendar-posts-divider")!,
	};

	if (
		!dom.titleContainer ||
		!dom.title ||
		!dom.prevBtn ||
		!dom.nextBtn ||
		!dom.backTodayBtn ||
		!dom.selectionPanel ||
		!dom.selectionContent ||
		!dom.grid ||
		!dom.postsList ||
		!dom.divider
	) {
		return;
	}
	widget.dataset.calendarInitialized = "true";

	function getCurrentPostId() {
		const normalizedPath = normalizePath(window.location.pathname);
		const matchedPost = posts.find((post) => {
			const postUrl = normalizePath(post.url);
			return normalizedPath === postUrl;
		});

		return matchedPost ? matchedPost.id : null;
	}

	function updateHeader() {
		dom.title.textContent = `${currentYear}${yearSuffix} ${monthNames[currentMonth]}`;
		const isCurrentRealMonth =
			currentYear === todayYear && currentMonth === todayMonth;
		const shouldShowReset = !isCurrentRealMonth || selectedDateKey !== null;

		if (shouldShowReset) dom.backTodayBtn.classList.remove("invisible");
		else dom.backTodayBtn.classList.add("invisible");
	}

	function renderPostList(postItems: typeof posts) {
		if (postItems.length === 0) {
			dom.divider.classList.add("hidden");
			dom.postsList.innerHTML = "";
			return;
		}

		dom.divider.classList.remove("hidden");
		const currentPostId = getCurrentPostId();

		const listHtml = postItems
			.map((post) => {
				const [, m, d] = post.date.split("-");
				const dateStr = `${Number.parseInt(m, 10)}-${Number.parseInt(d, 10)}`;

				const isCurrentPost = post.id === currentPostId;
				let containerClass =
					"flex items-center justify-between text-sm transition-colors px-2 py-2 rounded-lg group border border-transparent";
				const titleClass =
					"truncate flex-1 font-bold transition-colors";
				let dateClass =
					"text-xs ml-2 whitespace-nowrap transition-colors";

				if (isCurrentPost) {
					containerClass +=
						" bg-(--primary)/10 text-(--primary) border-(--primary)/10";
					dateClass += " text-(--primary)/80";
				} else {
					containerClass +=
						" text-neutral-700 dark:text-neutral-300 hover:text-(--primary) dark:hover:text-(--primary) hover:bg-(--btn-plain-bg-hover)";
					dateClass +=
						" text-neutral-400 group-hover:text-(--primary)/70";
				}

				return `
			<a href="${post.url}" class="${containerClass}">
				<span class="${titleClass}">${post.title}</span>
				<span class="${dateClass}">${dateStr}</span>
			</a>
		`;
			})
			.join("");

		dom.postsList.innerHTML = listHtml;
	}

	function showMonthlyPosts() {
		const key = `${currentYear}-${currentMonth}`;
		const monthPosts = postsByMonth[key] || [];
		renderPostList(monthPosts);
	}

	function renderCalendar() {
		updateHeader();
		const firstDayOfMonth =
			(new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;
		const daysInMonth = new Date(
			currentYear,
			currentMonth + 1,
			0,
		).getDate();

		let html = "";
		if (firstDayOfMonth > 0) {
			html += `<div class="aspect-square"></div>`.repeat(firstDayOfMonth);
		}

		for (let day = 1; day <= daysInMonth; day++) {
			const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
			const dayPosts = postDateMap[dateKey] || [];
			const hasPost = dayPosts.length > 0;
			const count = dayPosts.length;
			const isToday =
				currentYear === todayYear &&
				currentMonth === todayMonth &&
				day === todayDate;
			const isSelected = selectedDateKey === dateKey;

			let bgClass =
				"hover:bg-(--btn-plain-bg-hover) text-75 border border-transparent";

			if (isSelected) {
				bgClass =
					"bg-(--primary) text-white shadow-md border border-transparent";
			} else if (isToday) {
				bgClass =
					"text-(--primary) font-bold bg-(--primary)/10 border border-(--primary)";
			} else if (hasPost) {
				bgClass =
					"font-bold text-90 hover:bg-(--btn-plain-bg-hover) border border-transparent";
			}

			html += `
				<div class="calendar-day aspect-square flex items-center justify-center rounded-md cursor-pointer relative transition-all duration-200 ${bgClass}"
					data-date="${dateKey}">
					${day}
					${hasPost && !isSelected ? `<span class="absolute bottom-1 w-1 h-1 rounded-full bg-(--primary)"></span>` : ""}
					${hasPost && count > 1 ? `<span class="absolute top-0.5 right-0.5 text-[9px] opacity-70 scale-75">${count}</span>` : ""}
				</div>
			`;
		}

		dom.grid.innerHTML = html;
		if (selectedDateKey && postDateMap[selectedDateKey]) {
			renderPostList(postDateMap[selectedDateKey]);
		} else {
			showMonthlyPosts();
		}
	}

	function closeSelectionPanel() {
		dom.selectionPanel.classList.add("opacity-0");
		setTimeout(() => {
			dom.selectionPanel.classList.add("hidden");
			currentView = "day";
			renderCalendar();
		}, 200);
	}

	function showMonthPicker() {
		currentView = "month";
		updateHeader();
		dom.selectionPanel.classList.remove("hidden");
		requestAnimationFrame(() => {
			dom.selectionPanel.classList.remove("opacity-0");
		});

		dom.selectionContent.className =
			"w-full h-full p-4 grid grid-cols-3 gap-3 content-center";

		let html = "";
		monthNames.forEach((name, index) => {
			const isCurrentMonth = index === currentMonth;
			const hasPost = stats.hasPostInMonth[`${currentYear}-${index + 1}`];
			let cls =
				"month-item cursor-pointer rounded-lg flex flex-col items-center justify-center p-2 transition-all hover:bg-(--btn-plain-bg-hover) relative border border-transparent";
			if (isCurrentMonth)
				cls += " border-(--primary) text-(--primary) bg-(--primary)/5";
			else cls += " text-neutral-700 dark:text-neutral-300";

			html += `
				<div class="${cls}" data-month="${index}">
					<span class="text-sm font-bold">${name}</span>
					${hasPost ? `<span class="w-1 h-1 rounded-full bg-(--primary) mt-1"></span>` : `<span class="w-1 h-1 mt-1"></span>`}
				</div>
			`;
		});
		dom.selectionContent.innerHTML = html;
	}

	function showYearPicker() {
		currentView = "year";
		updateHeader();
		dom.selectionContent.className =
			"w-full h-full p-2 grid grid-cols-4 gap-2 content-start overflow-y-auto";

		let html = "";
		for (let y = stats.minYear; y <= stats.maxYear; y++) {
			const isCurrent = y === currentYear;
			const hasPost = stats.hasPostInYear[y];
			let cls =
				"year-item cursor-pointer rounded-lg flex flex-col items-center justify-center py-3 transition-all hover:bg-(--btn-plain-bg-hover) relative border border-transparent";
			if (isCurrent)
				cls += " border-(--primary) text-(--primary) bg-(--primary)/5";
			else cls += " text-neutral-700 dark:text-neutral-300";

			html += `
				<div class="${cls}" data-year="${y}" id="year-${y}">
					<span class="text-sm font-bold">${y}</span>
					${hasPost ? `<span class="w-1.5 h-1.5 rounded-full bg-(--primary) mt-1"></span>` : `<span class="w-1.5 h-1.5 mt-1"></span>`}
				</div>
			`;
		}
		dom.selectionContent.innerHTML = html;

		setTimeout(() => {
			const el = document.getElementById(`year-${currentYear}`);
			if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
		}, 50);
	}

	function setupEventListeners() {
		dom.titleContainer.addEventListener("click", (event) => {
			event.stopPropagation();
			if (currentView === "day") showMonthPicker();
			else if (currentView === "month") showYearPicker();
			else closeSelectionPanel();
		});

		dom.prevBtn.addEventListener("click", () => {
			currentMonth--;
			if (currentMonth < 0) {
				currentMonth = 11;
				currentYear--;
			}
			renderCalendar();
		});

		dom.nextBtn.addEventListener("click", () => {
			currentMonth++;
			if (currentMonth > 11) {
				currentMonth = 0;
				currentYear++;
			}
			renderCalendar();
		});

		dom.backTodayBtn.addEventListener("click", () => {
			currentYear = todayYear;
			currentMonth = todayMonth;
			selectedDateKey = null;
			if (currentView !== "day") closeSelectionPanel();
			else renderCalendar();
		});

		dom.grid.addEventListener("click", (event) => {
			const target = event.target;
			if (!(target instanceof Element)) return;

			const cell = target.closest(".calendar-day");
			if (!cell) return;
			const dateKey = cell.getAttribute("data-date");

			if (selectedDateKey === dateKey) selectedDateKey = null;
			else selectedDateKey = dateKey;

			renderCalendar();
			if (selectedDateKey && postDateMap[selectedDateKey]) {
				renderPostList(postDateMap[selectedDateKey]);
			} else {
				showMonthlyPosts();
			}
		});

		dom.selectionContent.addEventListener("click", (event) => {
			const target = event.target;
			if (!(target instanceof Element)) return;

			const monthItem = target.closest(".month-item");
			const yearItem = target.closest(".year-item");

			if (monthItem) {
				event.stopPropagation();
				currentMonth = Number.parseInt(
					monthItem.getAttribute("data-month") || "0",
					10,
				);
				closeSelectionPanel();
			} else if (yearItem) {
				event.stopPropagation();
				currentYear = Number.parseInt(
					yearItem.getAttribute("data-year") || `${todayYear}`,
					10,
				);
				showMonthPicker();
			}
		});

		document.addEventListener("click", (event) => {
			if (currentView === "day") return;
			const widget = document.getElementById("calendar-widget");
			const target = event.target;
			if (widget && target instanceof Node && !widget.contains(target)) {
				closeSelectionPanel();
			}
		});
	}

	renderCalendar();
	setupEventListeners();
}

onPageLifecycle("first-load", initCalendarWidget);
onPageLifecycle("page-view", initCalendarWidget);
